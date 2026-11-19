import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { workspacePath } from './workspaceAssets'
import { DEFAULT_HEAP } from './types'

export interface RunLaunchOptions {
  remoteHosts?: string[] | string
  heap?: string
  jvmArgs?: string
}

export const LOCAL_PROPERTIES_FILE = 'jmeter.properties.local'

// List of LTS Java paths compatible with Groovy & JMeter
const LTS_JAVA_CANDIDATES = [
  'C:\\Program Files\\Java\\jdk-11',
  'C:\\Program Files\\Java\\jdk-17',
  'C:\\Program Files\\Java\\jdk-21',
  'C:\\Program Files (x86)\\Java\\jdk-11',
  'C:\\Program Files\\Java\\jdk1.8.0',
  'C:\\Program Files\\Java\\jre1.8.0',
]

export function findCompatibleJavaHome(customJavaHome: string): string | null {
  if (customJavaHome && existsSync(customJavaHome)) {
    return customJavaHome
  }

  for (const p of LTS_JAVA_CANDIDATES) {
    if (existsSync(p) && existsSync(join(p, 'bin', 'java.exe'))) {
      return p
    }
  }

  if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME
  }

  return null
}

export function buildJMeterArgs(
  workspaceRoot: string,
  paths: { jmxPath: string; jtlPath: string; logFilePath: string; reportDir: string },
  remoteHosts?: string[] | string,
): string[] {
  const args = [
    '-n',
    `-JworkspaceRoot=${workspacePath(workspaceRoot)}`,
    `-JdownloadDir=${workspacePath(workspaceRoot, 'downloads')}`,
    `-Jfolderdata=${workspacePath(workspaceRoot, 'data')}`,
    `-Jdatafolder=${workspacePath(workspaceRoot, 'data')}/`,
    `-JfolderGPKD=${workspacePath(workspaceRoot)}`,
    '-t', paths.jmxPath,
    '-l', paths.jtlPath,
    '-j', paths.logFilePath,
    '-e',
    '-o', paths.reportDir,
  ]

  // Secrets (static bearer tokens...) kept out of git: workspace-root jmeter.properties.local (*.local is gitignored)
  const localProps = join(workspaceRoot, LOCAL_PROPERTIES_FILE)
  if (existsSync(localProps)) {
    args.push('-q', workspacePath(localProps))
  }

  if (remoteHosts) {
    const hosts = Array.isArray(remoteHosts)
      ? remoteHosts.filter(Boolean).join(',')
      : String(remoteHosts).trim()
    if (hosts) {
      args.push('-R', hosts)
    }
  }
  return args
}

export function buildRunEnv(javaHome: string | null, customHeap: string, options?: RunLaunchOptions): Record<string, string> {
  // SAFETY: process.env values are strings; undefined entries are dropped by spawn
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
  env.HEAP = options?.heap || customHeap || process.env.HEAP || DEFAULT_HEAP
  if (options?.jvmArgs || process.env.JVM_ARGS) {
    env.JVM_ARGS = options?.jvmArgs || process.env.JVM_ARGS || ''
  }
  return env
}
