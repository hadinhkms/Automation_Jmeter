import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve, isAbsolute } from 'node:path'

export interface JMeterDetectionResult {
  found: boolean
  path: string | null
  version: string | null
  error?: string
}

export interface JMeterDetectionOptions {
  customPath: string
  javaHome: string | null
  heap: string
}

const VERSION_TIMEOUT_MS = 15000
const NOT_FOUND_ERROR =
  'JMeter binary (jmeter.bat) was not found in PATH or standard directories. Please configure the path in JMeter Settings.'

/** Runs a shell command without blocking the Node event loop; kills the whole process tree on timeout. */
function runAsync(command: string, env: NodeJS.ProcessEnv, timeoutMs: number): Promise<string | null> {
  return new Promise((done) => {
    let settled = false
    const child = exec(command, { encoding: 'utf-8', env, windowsHide: true }, (err, stdout) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      done(err && !stdout ? null : stdout)
    })
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      killTree(child.pid)
      done(null)
    }, timeoutMs)
  })
}

function killTree(pid: number | undefined) {
  if (!pid) return
  if (process.platform === 'win32') {
    exec(`taskkill /pid ${pid} /T /F`, { windowsHide: true }, () => {})
    return
  }
  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    // already exited
  }
}

function buildEnv(javaHome: string | null, heap: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env }
  const systemRoot = process.env.SystemRoot || 'C:\\Windows'
  const existingPath = process.env.Path || process.env.PATH || ''
  const prefix = javaHome ? `${join(javaHome, 'bin')};` : ''
  const combinedPath = `${prefix}${join(systemRoot, 'System32')};${systemRoot};${existingPath}`
  if (javaHome) env.JAVA_HOME = javaHome
  env.PATH = combinedPath
  env.Path = combinedPath
  env.SystemRoot = systemRoot
  env.HEAP = heap
  return env
}

async function collectCandidates(customPath: string): Promise<string[]> {
  const candidates: string[] = []
  if (customPath) {
    candidates.push(customPath)
    if (!customPath.endsWith('.bat') && !customPath.endsWith('.sh') && !customPath.endsWith('jmeter')) {
      candidates.push(join(customPath, 'bin', 'jmeter.bat'), join(customPath, 'jmeter.bat'))
    }
  }
  if (process.env.JMETER_BIN) candidates.push(process.env.JMETER_BIN)
  if (process.env.JMETER_HOME) {
    candidates.push(join(process.env.JMETER_HOME, 'bin', 'jmeter.bat'), join(process.env.JMETER_HOME, 'bin', 'jmeter'))
  }

  const lookupCmd = process.platform === 'win32' ? 'where jmeter.bat' : 'which jmeter'
  const lookup = await runAsync(lookupCmd, process.env, 5000)
  const fromPath = lookup?.split(/\r?\n/)[0]?.trim()
  if (fromPath) candidates.push(fromPath)

  const cwd = process.cwd()
  candidates.push(
    join(cwd, 'apache-jmeter-5.6.3', 'apache-jmeter-5.6.3', 'bin', 'jmeter.bat'),
    join(cwd, 'apache-jmeter-5.6.3', 'bin', 'jmeter.bat'),
    join(cwd, 'bin', 'jmeter.bat'),
  )
  if (process.platform === 'win32') {
    candidates.push(
      'C:\\apache-jmeter\\bin\\jmeter.bat',
      'D:\\apache-jmeter\\bin\\jmeter.bat',
      'C:\\Program Files\\apache-jmeter\\bin\\jmeter.bat',
    )
  }
  return [...new Set(candidates.filter(Boolean))]
}

export async function getJMeterVersion(binPath: string, javaHome: string | null, heap: string): Promise<string | null> {
  const output = await runAsync(`"${binPath}" -v`, buildEnv(javaHome, heap), VERSION_TIMEOUT_MS)
  if (output === null) return null
  const match = output.match(/Version\s+([\d.]+)/i) || output.match(/jmeter\s+version\s+([\d.]+)/i)
  if (match) return match[1]
  if (output.includes('Apache JMeter')) return 'Apache JMeter'
  return 'Detected'
}

export async function detectJMeterInstall(opts: JMeterDetectionOptions): Promise<JMeterDetectionResult> {
  for (const p of await collectCandidates(opts.customPath)) {
    const resolvedPath = isAbsolute(p) ? p : resolve(process.cwd(), p)
    if (!existsSync(resolvedPath)) continue
    const version = await getJMeterVersion(resolvedPath, opts.javaHome, opts.heap)
    if (version) return { found: true, path: resolvedPath, version }
  }
  return { found: false, path: null, version: null, error: NOT_FOUND_ERROR }
}
