import { spawn, type ChildProcess, execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, cpSync, copyFileSync, symlinkSync, rmSync } from 'node:fs'
import { join, resolve, isAbsolute, dirname } from 'node:path'
import { EventEmitter } from 'node:events'

export interface JMeterDetectionResult {
  found: boolean
  path: string | null
  version: string | null
  error?: string
}

export interface JtlSample {
  id: string
  label: string
  code: number
  elapsed: number
  success: boolean
  method: string
  url: string
  request: string
  response: string
  threadName: string
  timestamp: string
  bytes: number
  sentBytes: number
  latency: number
  connectTime: number
  requestHeaders?: string
  responseHeaders?: string
}

export interface RunProgressMetrics {
  samples: number
  errors: number
  throughput: number
  avgTime: number
  minTime: number
  maxTime: number
  activeThreads: number
  durationSeconds: number
}

export interface RunSummary {
  runId: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  exitCode: number | null
  samples: JtlSample[]
  summaryRows: string[][]
  aggregateRows: string[][]
  totalSamples: number
  errorRate: number
  hasReport: boolean
  reportDir: string
  error?: string
}

export interface RunSamplesUpdate {
  runId: string
  samples: JtlSample[]
  summaryRows: string[][]
  aggregateRows: string[][]
  totalSamples: number
  totalErrors: number
  errorRate: number
  hasReport: boolean
}

const LIVE_RESULTS_POLL_MS = 1000
const LIVE_SUCCESS_SAMPLE_INTERVAL = 50
const LIVE_SAMPLE_DETAIL_CAP = 500
const FINAL_SAMPLE_DETAIL_CAP = 5000

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function syncWorkspaceAssets(workspaceRoot: string, targetRunDir: string) {
  const IGNORED_NAMES = new Set([
    'node_modules',
    '.git',
    '.gemini',
    '.openai',
    '.system_generated',
    '.tempmediaStorage',
    '.user_uploaded',
    'dist',
    'runs',
    'src',
    'server',
    'scripts',
    'tests',
    'apache-jmeter-5.6.3',
    'apache-jmeter-5.6.3.zip',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'tsconfig.app.tsbuildinfo',
    'tsconfig.node.tsbuildinfo',
    'vite.config.ts',
    'eslint.config.js',
    'index.html',
    'open-jmeter-web.bat',
    '.jmeter-web-port',
    'jmeter.log',
  ])

  try {
    const entries = readdirSync(workspaceRoot)
    for (const name of entries) {
      if (IGNORED_NAMES.has(name) || name.startsWith('.')) continue
      const srcPath = join(workspaceRoot, name)
      const destPath = join(targetRunDir, name)

      try {
        const stat = statSync(srcPath)
        if (stat.isDirectory()) {
          if (name === 'downloads') {
            try {
              symlinkSync(srcPath, destPath, process.platform === 'win32' ? 'junction' : 'dir')
            } catch {
              cpSync(srcPath, destPath, { recursive: true, force: true })
            }
          } else {
            cpSync(srcPath, destPath, { recursive: true, force: true })
          }
        } else if (stat.isFile() && !name.endsWith('.jmx') && !name.endsWith('.ts') && !name.endsWith('.tsx')) {
          copyFileSync(srcPath, destPath)
        }
      } catch (err) {
        console.warn(`[JMeterRunner] Failed to sync asset ${name} to ${targetRunDir}:`, err)
      }
    }
  } catch (err) {
    console.warn('[JMeterRunner] Failed to read workspaceRoot for asset syncing:', err)
  }
}

function escapeXmlText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function workspacePath(workspaceRoot: string, ...segments: string[]): string {
  return join(workspaceRoot, ...segments).replace(/\\/g, '/')
}

function replaceArgumentValue(jmxContent: string, variableName: string, value: string): string {
  const escapedValue = escapeXmlText(value)
  const pattern = new RegExp(
    `(<elementProp\\b(?=[^>]*\\bname=(["'])${variableName}\\2)[^>]*>[\\s\\S]*?<stringProp\\b(?=[^>]*\\bname=(["'])Argument\\.value\\3)[^>]*>)([\\s\\S]*?)(<\\/stringProp>)`,
    'gi',
  )

  return jmxContent.replace(
    pattern,
    (_match, prefix: string, _q1: string, _q2: string, _current: string, suffix: string) => `${prefix}${escapedValue}${suffix}`,
  )
}

function normalizeLegacyWorkspaceRoots(jmxContent: string, workspaceRoot: string): string {
  const escapedWorkspaceRoot = escapeXmlText(workspacePath(workspaceRoot))
  return jmxContent
    .replace(/[A-Z]:[\\/]Project_Jmeter(?=[\\/]|<|&quot;|$)/gi, escapedWorkspaceRoot)
    .replace(/[A-Z]:[\\/]Jmeter(?=[\\/]|<|&quot;|$)/gi, escapedWorkspaceRoot)
}

function normalizeWorkspaceAssetPaths(jmxContent: string, workspaceRoot: string): string {
  const projectRoot = workspacePath(workspaceRoot)
  const downloadDir = workspacePath(workspaceRoot, 'downloads')
  const dataDir = workspacePath(workspaceRoot, 'data')
  const dataDirWithSlash = `${dataDir}/`

  let normalized = normalizeLegacyWorkspaceRoots(jmxContent, workspaceRoot)

  normalized = replaceArgumentValue(normalized, 'downloadDir', downloadDir)
  normalized = replaceArgumentValue(normalized, 'folderdata', dataDir)
  normalized = replaceArgumentValue(normalized, 'datafolder', dataDirWithSlash)
  normalized = replaceArgumentValue(normalized, 'folderGPKD', projectRoot)

  const escapedDownloadDir = escapeXmlText(downloadDir)
  normalized = normalized.replace(
    /(<stringProp\b(?=[^>]*\bname=(["'])File\.path\2)[^>]*>)\s*downloads[\\/]+([\s\S]*?<\/stringProp>)/gi,
    (_match, prefix: string, _quote: string, rest: string) => `${prefix}${escapedDownloadDir}/${rest}`,
  )

  return normalized
}

function unescapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&#x0*([0-9a-fA-F]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
    .replace(/&#0*([0-9]+);/g, (_, dec) => {
      const code = parseInt(dec, 10)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\r\r\n/g, '\r\n')
    .replace(/\r(?!\n)/g, '\n')
}

export function parseVrtXml(vrtPath: string): Map<string | number, Partial<JtlSample>> {
  const result = new Map<string | number, Partial<JtlSample>>()
  if (!existsSync(vrtPath)) return result

  try {
    const content = readFileSync(vrtPath, 'utf-8')
    const tagOpenRegex = /<(httpSample|sample)\s+([^>]+)>/g
    let m: RegExpExecArray | null
    const openings: { attrs: string; contentStart: number; nextIndex: number }[] = []
    while ((m = tagOpenRegex.exec(content)) !== null) {
      openings.push({ attrs: m[2], contentStart: m.index + m[0].length, nextIndex: m.index })
    }

    for (let i = 0; i < openings.length; i++) {
      const cur = openings[i]
      const nextStart = i + 1 < openings.length ? openings[i + 1].nextIndex : content.length
      const inner = content.substring(cur.contentStart, nextStart)
      const tagAttrs = cur.attrs

      const lbMatch = tagAttrs.match(/\blb="([^"]*)"/)
      const rcMatch = tagAttrs.match(/\brc="([^"]*)"/)
      const sMatch = tagAttrs.match(/\bs="([^"]*)"/)
      const tMatch = tagAttrs.match(/\bt="([^"]*)"/)
      const tnMatch = tagAttrs.match(/\btn="([^"]*)"/)
      const byMatch = tagAttrs.match(/\bby="([^"]*)"/)
      const sbyMatch = tagAttrs.match(/\bsby="([^"]*)"/)
      const ltMatch = tagAttrs.match(/\blt="([^"]*)"/)
      const ctMatch = tagAttrs.match(/\bct="([^"]*)"/)
      const tsMatch = tagAttrs.match(/\bts="([^"]*)"/)

      const responseDataMatch = inner.match(/<responseData[^>]*>([\s\S]*?)<\/responseData>/)
      const requestHeaderMatch = inner.match(/<requestHeader[^>]*>([\s\S]*?)<\/requestHeader>/)
      const responseHeaderMatch = inner.match(/<responseHeader[^>]*>([\s\S]*?)<\/responseHeader>/)
      const samplerDataMatch = inner.match(/<samplerData[^>]*>([\s\S]*?)<\/samplerData>/)
      const methodMatch = inner.match(/<method[^>]*>([\s\S]*?)<\/method>/)
      const urlMatch = inner.match(/<java\.net\.URL>([\s\S]*?)<\/java\.net\.URL>/)
      const queryMatch = inner.match(/<queryString[^>]*>([\s\S]*?)<\/queryString>/)

      const responseData = responseDataMatch ? unescapeXml(responseDataMatch[1].trim()) : ''
      const requestHeader = requestHeaderMatch ? unescapeXml(requestHeaderMatch[1].trim()) : ''
      const responseHeader = responseHeaderMatch ? unescapeXml(responseHeaderMatch[1].trim()) : ''
      const samplerData = samplerDataMatch ? unescapeXml(samplerDataMatch[1].trim()) : ''
      const method = methodMatch ? methodMatch[1].trim().toUpperCase() : ''
      const url = urlMatch ? unescapeXml(urlMatch[1].trim()) : ''
      const queryString = queryMatch ? unescapeXml(queryMatch[1].trim()) : ''

      let requestContent = ''
      if (samplerData) {
        requestContent = samplerData
      } else if (queryString) {
        requestContent = queryString
      } else if (requestHeader) {
        requestContent = `${method || 'GET'} ${url}\n${requestHeader}`
      }

      const sampleObj: Partial<JtlSample> = {
        label: lbMatch ? unescapeXml(lbMatch[1]) : undefined,
        code: rcMatch ? Number(rcMatch[1]) : undefined,
        elapsed: tMatch ? Number(tMatch[1]) : undefined,
        success: sMatch ? sMatch[1] === 'true' : undefined,
        threadName: tnMatch ? unescapeXml(tnMatch[1]) : undefined,
        bytes: byMatch ? Number(byMatch[1]) : undefined,
        sentBytes: sbyMatch ? Number(sbyMatch[1]) : undefined,
        latency: ltMatch ? Number(ltMatch[1]) : undefined,
        connectTime: ctMatch ? Number(ctMatch[1]) : undefined,
        timestamp: tsMatch ? new Date(Number(tsMatch[1])).toLocaleTimeString() : undefined,
        method: method || 'HTTP',
        url: url || undefined,
        request: requestContent || undefined,
        response: responseData || undefined,
        requestHeaders: requestHeader || undefined,
        responseHeaders: responseHeader || undefined,
      }

      const sampleIdx = i + 1
      result.set(sampleIdx, sampleObj)
      const tsVal = tsMatch ? tsMatch[1] : ''
      const lbVal = lbMatch ? unescapeXml(lbMatch[1]) : ''
      if (tsVal) {
        result.set(`${tsVal}_${lbVal}`, sampleObj)
        if (!result.has(tsVal)) {
          result.set(tsVal, sampleObj)
        }
      }
    }
  } catch (err) {
    console.error('Error parsing vrt_results.xml:', err)
  }

  return result
}

export class JMeterRunner extends EventEmitter {

  private customPath: string = ''
  private customJavaHome: string = ''
  private currentProcess: ChildProcess | null = null
  private currentRunId: string | null = null
  private isRunning: boolean = false
  private logs: string[] = []
  private lastSummary: RunSummary | null = null
  private runsBaseDir: string = resolve(process.cwd(), 'runs')
  private liveResultsTimer: ReturnType<typeof setInterval> | null = null
  private lastLiveSampleCount: number = 0

  constructor() {
    super()
    if (!existsSync(this.runsBaseDir)) {
      mkdirSync(this.runsBaseDir, { recursive: true })
    }
    this.cleanOldRuns(10)
  }

  public cleanOldRuns(maxKeep = 10): number {
    try {
      if (!existsSync(this.runsBaseDir)) return 0
      const entries = readdirSync(this.runsBaseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name.startsWith('run_'))
        .map((d) => {
          const fullPath = join(this.runsBaseDir, d.name)
          let mtime = 0
          try {
            mtime = statSync(fullPath).mtimeMs
          } catch {
            mtime = 0
          }
          return { name: d.name, path: fullPath, mtime }
        })
        .sort((a, b) => b.mtime - a.mtime)

      if (entries.length > maxKeep) {
        const toDelete = entries.slice(maxKeep)
        for (const item of toDelete) {
          try {
            rmSync(item.path, { recursive: true, force: true })
          } catch (err) {
            console.warn(`[JMeterRunner] Failed to clean old run ${item.name}:`, err)
          }
        }
        return toDelete.length
      }
    } catch (err) {
      console.warn('[JMeterRunner] Failed during cleanOldRuns:', err)
    }
    return 0
  }

  public setCustomPath(path: string) {
    this.customPath = path.trim()
  }

  public getCustomPath(): string {
    return this.customPath
  }

  public setCustomJavaHome(path: string) {
    this.customJavaHome = path.trim()
  }

  public getCustomJavaHome(): string {
    return this.customJavaHome
  }

  public getCompatibleJavaHome(): string | null {
    if (this.customJavaHome && existsSync(this.customJavaHome)) {
      return this.customJavaHome
    }

    // List of LTS Java paths compatible with Groovy & JMeter
    const ltsCandidates = [
      'C:\\Program Files\\Java\\jdk-11',
      'C:\\Program Files\\Java\\jdk-17',
      'C:\\Program Files\\Java\\jdk-21',
      'C:\\Program Files (x86)\\Java\\jdk-11',
      'C:\\Program Files\\Java\\jdk1.8.0',
      'C:\\Program Files\\Java\\jre1.8.0',
    ]

    for (const p of ltsCandidates) {
      if (existsSync(p) && existsSync(join(p, 'bin', 'java.exe'))) {
        return p
      }
    }

    if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) {
      return process.env.JAVA_HOME
    }

    return null
  }


  public detectJMeter(): JMeterDetectionResult {
    const candidatePaths: string[] = []

    if (this.customPath) {
      candidatePaths.push(this.customPath)
      if (!this.customPath.endsWith('.bat') && !this.customPath.endsWith('.sh') && !this.customPath.endsWith('jmeter')) {
        candidatePaths.push(join(this.customPath, 'bin', 'jmeter.bat'))
        candidatePaths.push(join(this.customPath, 'jmeter.bat'))
      }
    }

    if (process.env.JMETER_BIN) candidatePaths.push(process.env.JMETER_BIN)
    if (process.env.JMETER_HOME) {
      candidatePaths.push(join(process.env.JMETER_HOME, 'bin', 'jmeter.bat'))
      candidatePaths.push(join(process.env.JMETER_HOME, 'bin', 'jmeter'))
    }

    // Check system PATH
    try {
      const isWin = process.platform === 'win32'
      const lookupCmd = isWin ? 'where jmeter.bat' : 'which jmeter'
      const stdout = execSync(lookupCmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] })
      const foundPath = stdout.split(/\r?\n/)[0]?.trim()
      if (foundPath) candidatePaths.push(foundPath)
    } catch {
      // not found in PATH
    }

    // Workspace relative JMeter paths
    candidatePaths.push(
      join(process.cwd(), 'apache-jmeter-5.6.3', 'apache-jmeter-5.6.3', 'bin', 'jmeter.bat'),
      join(process.cwd(), 'apache-jmeter-5.6.3', 'bin', 'jmeter.bat'),
      join(process.cwd(), 'bin', 'jmeter.bat'),
    )

    // Common Windows paths
    if (process.platform === 'win32') {
      candidatePaths.push(
        'C:\\apache-jmeter\\bin\\jmeter.bat',
        'D:\\apache-jmeter\\bin\\jmeter.bat',
        'C:\\Program Files\\apache-jmeter\\bin\\jmeter.bat',
      )
    }

    for (const p of candidatePaths) {
      if (!p) continue
      try {
        const resolvedPath = isAbsolute(p) ? p : resolve(process.cwd(), p)
        if (existsSync(resolvedPath)) {
          const version = this.getVersion(resolvedPath)
          if (version) {
            return { found: true, path: resolvedPath, version }
          }
        }
      } catch {
        // continue
      }
    }

    return {
      found: false,
      path: null,
      version: null,
      error: 'JMeter binary (jmeter.bat) was not found in PATH or standard directories. Please configure the path in JMeter Settings.',
    }
  }

  public getVersion(binPath: string): string | null {
    try {
      const javaHome = this.getCompatibleJavaHome()
      const env: Record<string, string> = { ...(process.env as Record<string, string>) }
      const existingPath = process.env.Path || process.env.PATH || ''
      const systemRoot = process.env.SystemRoot || 'C:\\Windows'
      const system32 = join(systemRoot, 'System32')

      if (javaHome) {
        env.JAVA_HOME = javaHome
        const combinedPath = `${join(javaHome, 'bin')};${system32};${systemRoot};${existingPath}`
        env.PATH = combinedPath
        env.Path = combinedPath
      } else {
        const combinedPath = `${system32};${systemRoot};${existingPath}`
        env.PATH = combinedPath
        env.Path = combinedPath
      }
      env.SystemRoot = systemRoot

      const output = execSync(`"${binPath}" -v`, {
        encoding: 'utf-8',
        timeout: 10000,
        env,
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
      })
      const match = output.match(/Version\s+([\d.]+)/i) || output.match(/jmeter\s+version\s+([\d.]+)/i)
      if (match) return match[1]
      if (output.includes('Apache JMeter')) return 'Apache JMeter'
      return 'Detected'
    } catch {
      return null
    }
  }

  private stopLiveResultsPolling() {
    if (this.liveResultsTimer) {
      clearInterval(this.liveResultsTimer)
      this.liveResultsTimer = null
    }
    this.lastLiveSampleCount = 0
  }

  private emitLiveResults(runId: string, jtlPath: string, reportDir: string) {
    const parsed = this.parseJtl(jtlPath)
    if (parsed.samples.length <= this.lastLiveSampleCount) return

    const previousSampleCount = this.lastLiveSampleCount
    const nextSamples = parsed.samples.slice(this.lastLiveSampleCount)
    this.lastLiveSampleCount = parsed.samples.length
    const totalErrors = parsed.samples.filter((sample) => !sample.success).length

    const update: RunSamplesUpdate = {
      runId,
      samples: this.selectLiveSampleDetails(nextSamples, previousSampleCount),
      summaryRows: parsed.summaryRows,
      aggregateRows: parsed.aggregateRows,
      totalSamples: parsed.samples.length,
      totalErrors,
      errorRate: parsed.errorRate,
      hasReport: existsSync(join(reportDir, 'index.html')),
    }

    this.emit('samples', update)
  }

  private selectLiveSampleDetails(samples: JtlSample[], offset: number): JtlSample[] {
    const selected: JtlSample[] = []

    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index]
      const sampleNumber = offset + index + 1
      if (!sample.success || sampleNumber <= 100 || sampleNumber % LIVE_SUCCESS_SAMPLE_INTERVAL === 0) {
        selected.push(sample)
      }
      if (selected.length >= LIVE_SAMPLE_DETAIL_CAP) break
    }

    return selected
  }

  private selectFinalSampleDetails(samples: JtlSample[]): JtlSample[] {
    if (samples.length <= FINAL_SAMPLE_DETAIL_CAP) return samples

    const selected: JtlSample[] = []
    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index]
      const sampleNumber = index + 1
      if (!sample.success || sampleNumber <= 100 || sampleNumber % LIVE_SUCCESS_SAMPLE_INTERVAL === 0) {
        selected.push(sample)
      }
      if (selected.length >= FINAL_SAMPLE_DETAIL_CAP) break
    }

    return selected
  }


  public async startRun(
    jmxContent: string,
    testName = 'test_plan',
    options?: { remoteHosts?: string[] | string },
  ): Promise<{ runId: string; reportDir: string }> {
    if (this.isRunning) {
      if (this.currentProcess) {
        throw new Error('A test is already running. Click "Force Stop & Reset" on the banner or the Stop button on the toolbar before starting a new run.')
      } else {
        this.isRunning = false
      }
    }

    const detection = this.detectJMeter()
    if (!detection.found || !detection.path) {
      throw new Error(detection.error || 'JMeter executable not found.')
    }

    // Ensure log retention: keep at most 10 runs (clean to 9 before creating new one)
    this.cleanOldRuns(9)

    const runId = `run_${Date.now()}`
    const runDir = join(this.runsBaseDir, runId)
    const reportDir = join(runDir, 'report')
    mkdirSync(runDir, { recursive: true })

    // Synchronize workspace asset folders (e.g. data/, GPKD/, etc.) so FileServer.getBaseDir() resolves data/provinces.csv
    syncWorkspaceAssets(process.cwd(), runDir)

    const jmxPath = join(runDir, `${testName.replace(/[^a-z0-9_-]/gi, '_')}.jmx`)
    const jtlPath = join(runDir, 'results.jtl')
    const logFilePath = join(runDir, 'jmeter.log')

    const workspaceRoot = process.cwd()
    const runnableJmxContent = normalizeWorkspaceAssetPaths(jmxContent, workspaceRoot)
    writeFileSync(jmxPath, runnableJmxContent, 'utf-8')

    this.currentRunId = runId
    this.isRunning = true
    this.logs = []
    this.lastSummary = null
    this.stopLiveResultsPolling()

    this.emit('start', { runId, jmxPath })

    const args = [
      '-n',
      `-JworkspaceRoot=${workspacePath(workspaceRoot)}`,
      `-JdownloadDir=${workspacePath(workspaceRoot, 'downloads')}`,
      `-Jfolderdata=${workspacePath(workspaceRoot, 'data')}`,
      `-Jdatafolder=${workspacePath(workspaceRoot, 'data')}/`,
      `-JfolderGPKD=${workspacePath(workspaceRoot)}`,
      '-t', jmxPath,
      '-l', jtlPath,
      '-j', logFilePath,
      '-e',
      '-o', reportDir,
    ]

    if (options?.remoteHosts) {
      const hosts = Array.isArray(options.remoteHosts)
        ? options.remoteHosts.filter(Boolean).join(',')
        : String(options.remoteHosts).trim()
      if (hosts) {
        args.push('-R', hosts)
      }
    }

    const javaHome = this.getCompatibleJavaHome()
    const env: Record<string, string> = { ...(process.env as Record<string, string>) }
    const existingPath = process.env.Path || process.env.PATH || ''
    const systemRoot = process.env.SystemRoot || 'C:\\Windows'
    const system32 = join(systemRoot, 'System32')

    if (javaHome) {
      env.JAVA_HOME = javaHome
      const combinedPath = `${join(javaHome, 'bin')};${system32};${systemRoot};${existingPath}`
      env.PATH = combinedPath
      env.Path = combinedPath
    } else {
      const combinedPath = `${system32};${systemRoot};${existingPath}`
      env.PATH = combinedPath
      env.Path = combinedPath
    }
    env.SystemRoot = systemRoot

    const child = spawn(detection.path, args, {
      cwd: runDir,
      env,
      shell: true,
      windowsHide: true,
    })



    this.currentProcess = child
    this.liveResultsTimer = setInterval(() => {
      try {
        this.emitLiveResults(runId, jtlPath, reportDir)
      } catch (err) {
        console.warn('[JMeterRunner] Failed to stream live JTL samples:', err)
      }
    }, LIVE_RESULTS_POLL_MS)

    const appendLog = (chunk: Buffer | string, type: 'stdout' | 'stderr') => {
      const text = chunk.toString()
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Suppress repeated JVM deprecation warnings from cluttering console
        if (
          trimmed.includes('Warning: Nashorn engine is planned to be removed') ||
          trimmed.includes('WARN StatusConsoleListener The use of package scanning')
        ) {
          continue
        }

        this.logs.push(trimmed)
        this.emit('log', { runId, line: trimmed, type })

        const summaryMatch = trimmed.match(/summary\s*([+=])\s*(\d+)\s+in\s+([\d:]+)\s*=\s*([\d.]+)\/s\s+Avg:\s*(\d+)\s+Min:\s*(\d+)\s+Max:\s*(\d+)\s+Err:\s*(\d+)\s*\(([\d.]+)%\)/)
        if (summaryMatch) {
          const [, , countStr, , throughputStr, avgStr, minStr, maxStr, errStr] = summaryMatch
          const metrics: RunProgressMetrics = {
            samples: Number(countStr) || 0,
            errors: Number(errStr) || 0,
            throughput: Number(throughputStr) || 0,
            avgTime: Number(avgStr) || 0,
            minTime: Number(minStr) || 0,
            maxTime: Number(maxStr) || 0,
            activeThreads: 0,
            durationSeconds: 0,
          }
          this.emit('progress', { runId, metrics })
        }
      }
    }


    child.stdout?.on('data', (data) => appendLog(data, 'stdout'))
    child.stderr?.on('data', (data) => appendLog(data, 'stderr'))

    child.on('close', (exitCode) => {
      this.emitLiveResults(runId, jtlPath, reportDir)
      this.stopLiveResultsPolling()
      this.isRunning = false
      this.currentProcess = null

      let hasReport = false
      if (existsSync(join(reportDir, 'index.html'))) {
        hasReport = true
      }

      const parsed = this.parseJtl(jtlPath)

      const summary: RunSummary = {
        runId,
        status: exitCode === 0 ? 'completed' : 'failed',
        exitCode,
        samples: this.selectFinalSampleDetails(parsed.samples),
        summaryRows: parsed.summaryRows,
        aggregateRows: parsed.aggregateRows,
        totalSamples: parsed.samples.length,
        errorRate: parsed.errorRate,
        hasReport,
        reportDir,
      }

      this.lastSummary = summary
      this.emit('complete', summary)
    })

    child.on('error', (err) => {
      this.stopLiveResultsPolling()
      this.isRunning = false
      this.currentProcess = null
      this.emit('error', { runId, error: err.message })
    })

    return { runId, reportDir }
  }

  public stopRun() {
    try {
      if (this.currentProcess) {
        if (process.platform === 'win32' && this.currentProcess.pid) {
          execSync(`taskkill /pid ${this.currentProcess.pid} /T /F`, { stdio: 'ignore' })
        } else {
          this.currentProcess.kill('SIGKILL')
        }
      }
    } catch {
      // ignore
    } finally {
      this.stopLiveResultsPolling()
      this.isRunning = false
      this.currentProcess = null
      this.emit('stopped', { runId: this.currentRunId })
    }
    return { success: true }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      currentRunId: this.currentRunId,
      logs: this.logs.slice(-200),
      lastSummary: this.lastSummary,
    }
  }

  public getRunResults(runId?: string): RunSummary | null {
    if (!runId || runId === this.currentRunId) {
      if (this.lastSummary) return this.lastSummary
      if (existsSync(this.runsBaseDir)) {
        const runs = readdirSync(this.runsBaseDir)
          .filter((f) => f.startsWith('run_'))
          .sort()
          .reverse()
        if (runs.length > 0) {
          return this.getRunResults(runs[0])
        }
      }
      return null
    }
    const targetDir = join(this.runsBaseDir, runId)
    const jtlPath = join(targetDir, 'results.jtl')
    const reportDir = join(targetDir, 'report')
    if (!existsSync(jtlPath)) return null

    const parsed = this.parseJtl(jtlPath)
    return {
      runId,
      status: 'completed',
      exitCode: 0,
      samples: this.selectFinalSampleDetails(parsed.samples),
      summaryRows: parsed.summaryRows,
      aggregateRows: parsed.aggregateRows,
      totalSamples: parsed.samples.length,
      errorRate: parsed.errorRate,
      hasReport: existsSync(join(reportDir, 'index.html')),
      reportDir,
    }
  }

  public parseJtl(jtlPath: string): {
    samples: JtlSample[]
    summaryRows: string[][]
    aggregateRows: string[][]
    errorRate: number
  } {
    if (!existsSync(jtlPath)) {
      return { samples: [], summaryRows: [], aggregateRows: [], errorRate: 0 }
    }

    try {
      const vrtPath = join(dirname(jtlPath), 'vrt_results.xml')
      const vrtData = existsSync(vrtPath) ? parseVrtXml(vrtPath) : new Map<string | number, Partial<JtlSample>>()

      const content = readFileSync(jtlPath, 'utf-8')
      const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
      if (lines.length <= 1) {
        return { samples: [], summaryRows: [], aggregateRows: [], errorRate: 0 }
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.trim())
      const idxTimeStamp = headers.indexOf('timeStamp')
      const idxElapsed = headers.indexOf('elapsed')
      const idxLabel = headers.indexOf('label')
      const idxResponseCode = headers.indexOf('responseCode')
      const idxResponseMessage = headers.indexOf('responseMessage')
      const idxThreadName = headers.indexOf('threadName')
      const idxSuccess = headers.indexOf('success')
      const idxFailureMessage = headers.indexOf('failureMessage')
      const idxBytes = headers.indexOf('bytes')
      const idxSentBytes = headers.indexOf('sentBytes')
      const idxLatency = headers.indexOf('Latency')
      const idxConnect = headers.indexOf('Connect')
      const idxURL = headers.indexOf('URL')

      const samples: JtlSample[] = []
      const labelStats: Record<string, {
        count: number
        elapsedList: number[]
        errors: number
        bytesTotal: number
        sentBytesTotal: number
        min: number
        max: number
      }> = {}

      for (let i = 1; i < lines.length; i += 1) {
        const row = parseCsvLine(lines[i])
        if (row.length < headers.length) continue

        const label = row[idxLabel] || `Sample ${i}`
        const elapsed = Number(row[idxElapsed]) || 0
        const success = (row[idxSuccess] || '').toLowerCase() === 'true'
        const code = Number(row[idxResponseCode]) || (success ? 200 : 500)
        const bytes = Number(row[idxBytes]) || 0
        const sentBytes = Number(row[idxSentBytes]) || 0
        const latency = Number(row[idxLatency]) || 0
        const connect = Number(row[idxConnect]) || 0
        const threadName = row[idxThreadName] || ''
        const timestamp = row[idxTimeStamp] ? new Date(Number(row[idxTimeStamp])).toLocaleTimeString() : ''
        const url = (idxURL !== -1 ? row[idxURL] : '') || ''
        const respMsg = (idxResponseMessage !== -1 ? row[idxResponseMessage] : '') || ''
        const failureMsg = (idxFailureMessage !== -1 ? row[idxFailureMessage] : '') || ''

        const rawTs = idxTimeStamp !== -1 ? String(row[idxTimeStamp]).trim() : ''
        const vrt = (rawTs ? vrtData.get(`${rawTs}_${label}`) : null)
          || (rawTs ? vrtData.get(rawTs) : null)
          || vrtData.get(i)
        const finalUrl = vrt?.url || url
        const finalMethod = vrt?.method || 'HTTP'
        const finalRequest = vrt?.request || `Thread: ${threadName}\nURL: ${finalUrl}`
        const finalResponse = vrt?.response || `Status: ${code} ${respMsg}${failureMsg ? `\nFailure: ${failureMsg}` : ''}\nLatency: ${latency}ms\nConnect: ${connect}ms\nBytes: ${bytes}`

        samples.push({
          id: `sample-${i}`,
          label: vrt?.label || label,
          code: vrt?.code !== undefined ? vrt.code : code,
          elapsed: vrt?.elapsed !== undefined ? vrt.elapsed : elapsed,
          success: vrt?.success !== undefined ? vrt.success : success,
          method: finalMethod,
          url: finalUrl,
          request: finalRequest,
          response: finalResponse,
          threadName: vrt?.threadName || threadName,
          timestamp: vrt?.timestamp || timestamp,
          bytes: vrt?.bytes !== undefined ? vrt.bytes : bytes,
          sentBytes: vrt?.sentBytes !== undefined ? vrt.sentBytes : sentBytes,
          latency: vrt?.latency !== undefined ? vrt.latency : latency,
          connectTime: vrt?.connectTime !== undefined ? vrt.connectTime : connect,
          requestHeaders: vrt?.requestHeaders,
          responseHeaders: vrt?.responseHeaders,
        })


        if (!labelStats[label]) {
          labelStats[label] = {
            count: 0,
            elapsedList: [],
            errors: 0,
            bytesTotal: 0,
            sentBytesTotal: 0,
            min: Infinity,
            max: -Infinity,
          }
        }
        const s = labelStats[label]
        s.count += 1
        s.elapsedList.push(elapsed)
        if (!success) s.errors += 1
        s.bytesTotal += bytes
        s.sentBytesTotal += sentBytes
        if (elapsed < s.min) s.min = elapsed
        if (elapsed > s.max) s.max = elapsed
      }

      const summaryRows: string[][] = []
      const aggregateRows: string[][] = []
      let totalCount = 0
      let totalErrors = 0
      let totalElapsedSum = 0
      let globalMin = Infinity
      let globalMax = -Infinity
      let totalBytes = 0
      let totalSentBytes = 0

      for (const [label, stat] of Object.entries(labelStats)) {
        stat.elapsedList.sort((a, b) => a - b)
        const count = stat.count
        const avg = Math.round(stat.elapsedList.reduce((a, b) => a + b, 0) / count)
        const min = stat.min === Infinity ? 0 : stat.min
        const max = stat.max === -Infinity ? 0 : stat.max
        const errPercent = ((stat.errors / count) * 100).toFixed(2) + '%'
        const median = stat.elapsedList[Math.floor(count * 0.5)] || 0
        const p90 = stat.elapsedList[Math.floor(count * 0.9)] || max
        const p95 = stat.elapsedList[Math.floor(count * 0.95)] || max
        const p99 = stat.elapsedList[Math.floor(count * 0.99)] || max

        const variance = stat.elapsedList.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count
        const stdDev = Math.sqrt(variance).toFixed(1)

        summaryRows.push([
          label,
          count.toLocaleString(),
          String(avg),
          String(min),
          String(max),
          stdDev,
          errPercent,
          `${(count / Math.max(1, (max - min) / 1000 || 1)).toFixed(1)}`,
          (stat.bytesTotal / 1024).toFixed(1),
          (stat.sentBytesTotal / 1024).toFixed(1),
          String(Math.round(stat.bytesTotal / count)),
        ])

        aggregateRows.push([
          label,
          count.toLocaleString(),
          String(avg),
          String(median),
          String(p90),
          String(p95),
          String(p99),
          String(min),
          String(max),
          errPercent,
          `${(count / Math.max(1, (max - min) / 1000 || 1)).toFixed(1)}`,
          (stat.bytesTotal / 1024).toFixed(1),
          (stat.sentBytesTotal / 1024).toFixed(1),
        ])

        totalCount += count
        totalErrors += stat.errors
        totalElapsedSum += stat.elapsedList.reduce((a, b) => a + b, 0)
        totalBytes += stat.bytesTotal
        totalSentBytes += stat.sentBytesTotal
        if (min < globalMin) globalMin = min
        if (max > globalMax) globalMax = max
      }

      if (totalCount > 0) {
        const totalAvg = Math.round(totalElapsedSum / totalCount)
        const totalErrPercent = ((totalErrors / totalCount) * 100).toFixed(2) + '%'
        summaryRows.push([
          'TOTAL',
          totalCount.toLocaleString(),
          String(totalAvg),
          String(globalMin === Infinity ? 0 : globalMin),
          String(globalMax === -Infinity ? 0 : globalMax),
          '--',
          totalErrPercent,
          '--',
          (totalBytes / 1024).toFixed(1),
          (totalSentBytes / 1024).toFixed(1),
          String(Math.round(totalBytes / totalCount)),
        ])

        aggregateRows.push([
          'TOTAL',
          totalCount.toLocaleString(),
          String(totalAvg),
          '--',
          '--',
          '--',
          '--',
          String(globalMin === Infinity ? 0 : globalMin),
          String(globalMax === -Infinity ? 0 : globalMax),
          totalErrPercent,
          '--',
          (totalBytes / 1024).toFixed(1),
          (totalSentBytes / 1024).toFixed(1),
        ])
      }

      const errorRate = totalCount > 0 ? (totalErrors / totalCount) * 100 : 0
      return { samples, summaryRows, aggregateRows, errorRate }
    } catch (err) {
      console.warn('Failed to parse JTL file:', err)
      return { samples: [], summaryRows: [], aggregateRows: [], errorRate: 0 }
    }
  }
}

export const jmeterRunner = new JMeterRunner()
