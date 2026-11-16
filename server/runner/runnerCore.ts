import { spawn, type ChildProcess, execSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { enforceVrtListenerCapture } from '../vrtListenerConfig'
import { LIVE_RESULTS_POLL_MS, type ParsedJtl, type RunSummary } from './types'
import { normalizeWorkspaceAssetPaths, syncWorkspaceAssets } from './workspaceAssets'
import { parseJtlFile } from './jtlParser'
import { buildLiveUpdate, buildRunSummary } from './runSummaryBuilder'
import { buildJMeterArgs, buildRunEnv, type RunLaunchOptions } from './runEnvironment'
import { cleanOldRunDirs, findLatestRunId } from './runRetention'
import { isSuppressedLogLine, parseSummaryLine } from './logParser'
import { JMeterRunnerConfig } from './runnerConfig'

export class JMeterRunner extends JMeterRunnerConfig {
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
    return cleanOldRunDirs(this.runsBaseDir, maxKeep)
  }

  private stopLiveResultsPolling() {
    if (this.liveResultsTimer) {
      clearInterval(this.liveResultsTimer)
      this.liveResultsTimer = null
    }
    this.lastLiveSampleCount = 0
  }

  private emitLiveResults(runId: string, jtlPath: string, reportDir: string) {
    const live = buildLiveUpdate(runId, jtlPath, reportDir, this.lastLiveSampleCount)
    if (!live) return
    this.lastLiveSampleCount = live.sampleCount
    this.emit('samples', live.update)
  }

  private appendLog(runId: string, chunk: Buffer | string, type: 'stdout' | 'stderr') {
    const lines = chunk.toString().split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || isSuppressedLogLine(trimmed)) continue

      this.logs.push(trimmed)
      this.emit('log', { runId, line: trimmed, type })

      const metrics = parseSummaryLine(trimmed)
      if (metrics) this.emit('progress', { runId, metrics })
    }
  }

  public async startRun(
    jmxContent: string,
    testName = 'test_plan',
    options?: RunLaunchOptions,
  ): Promise<{ runId: string; reportDir: string }> {
    if (this.isRunning) {
      if (this.currentProcess) {
        throw new Error('A test is already running. Click "Force Stop & Reset" on the banner or the Stop button on the toolbar before starting a new run.')
      } else {
        this.isRunning = false
      }
    }

    const detection = await this.detectJMeter()
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
    const vrtFilePath = join(runDir, 'vrt_results.xml').replace(/\\/g, '/')
    const runnableJmxContent = enforceVrtListenerCapture(normalizeWorkspaceAssetPaths(jmxContent, workspaceRoot), vrtFilePath)
    writeFileSync(jmxPath, runnableJmxContent, 'utf-8')

    this.currentRunId = runId
    this.isRunning = true
    this.logs = []
    this.lastSummary = null
    this.stopLiveResultsPolling()

    this.emit('start', { runId, jmxPath })

    const args = buildJMeterArgs(workspaceRoot, { jmxPath, jtlPath, logFilePath, reportDir }, options?.remoteHosts)
    const env = buildRunEnv(this.getCompatibleJavaHome(), this.customHeap, options)

    const child = spawn(detection.path, args, { cwd: runDir, env, shell: true, windowsHide: true })

    this.currentProcess = child
    this.liveResultsTimer = setInterval(() => {
      try {
        this.emitLiveResults(runId, jtlPath, reportDir)
      } catch (err) {
        console.warn('[JMeterRunner] Failed to stream live JTL samples:', err)
      }
    }, LIVE_RESULTS_POLL_MS)

    child.stdout?.on('data', (data) => this.appendLog(runId, data, 'stdout'))
    child.stderr?.on('data', (data) => this.appendLog(runId, data, 'stderr'))

    child.on('close', (exitCode) => {
      this.emitLiveResults(runId, jtlPath, reportDir)
      this.stopLiveResultsPolling()
      this.isRunning = false
      this.currentProcess = null

      const summary = buildRunSummary(runId, exitCode, jtlPath, reportDir, exitCode === 0 ? 'completed' : 'failed')
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
    // Không có runId (hoặc hỏi đúng run hiện tại): ưu tiên summary trong bộ nhớ,
    // nếu chưa có thì resolve ra run dir mới nhất rồi ĐỌC TRỰC TIẾP bên dưới (không đệ quy -> tránh stack overflow).
    if (!runId || runId === this.currentRunId) {
      if (this.lastSummary) return this.lastSummary
      if (!runId) runId = findLatestRunId(this.runsBaseDir)
      if (!runId) return null
      // rơi xuống nhánh đọc trực tiếp theo runId đã resolve
    }
    const targetDir = join(this.runsBaseDir, runId)
    const jtlPath = join(targetDir, 'results.jtl')
    const reportDir = join(targetDir, 'report')
    if (!existsSync(jtlPath)) return null

    return buildRunSummary(runId, 0, jtlPath, reportDir, 'completed')
  }

  public parseJtl(jtlPath: string): ParsedJtl {
    return parseJtlFile(jtlPath)
  }
}
