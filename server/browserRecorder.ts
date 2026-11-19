import type { ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { EventEmitter } from 'node:events'
import type { RecordedRequest, BrowserDetection } from '../src/models/recorder'
import { detectBrowsers, resolveBrowserExecutable } from './recorder/browserDetect'
import { buildBrowserLaunchArgs, NETWORK_ENABLE_PARAMS, waitForDebuggerUrl } from './recorder/cdpTransport'
import { CdpClient } from './recorder/cdpClient'
import { handleCdpEvent } from './recorder/cdpEventRouter'
import type { CdpEventContext } from './recorder/cdpEventContext'
import { launchBrowser, scheduleProfileDirRemoval, terminateBrowser } from './recorder/processCleanup'

class BrowserRecorderManager extends EventEmitter {
  private browserProcess: ChildProcess | null = null
  private cdp: CdpClient | null = null
  private isRecording = false
  private currentTransaction = '01_Open_Application'
  private recordedRequests: RecordedRequest[] = []
  private activePort = 9222
  private tempProfileDir = ''
  private currentTargetUrl = ''
  private selectedBrowserType: 'chrome' | 'edge' | 'custom' = 'chrome'
  private maxRequestsInMemory = 1000
  private autoPageSplit = true
  private pageStepIndex = 1

  public detectBrowsers(): BrowserDetection {
    return detectBrowsers()
  }

  public getStatus() {
    return {
      isRecording: this.isRecording,
      currentTransaction: this.currentTransaction,
      requestCount: this.recordedRequests.length,
      targetUrl: this.currentTargetUrl,
      browserType: this.selectedBrowserType,
      autoPageSplit: this.autoPageSplit,
      requests: this.recordedRequests,
    }
  }

  public setAutoPageSplit(enabled: boolean) {
    this.autoPageSplit = Boolean(enabled)
  }

  public setTransaction(name: string) {
    this.currentTransaction = name.trim() || 'Default Transaction'
    this.emit('transaction-changed', { transaction: this.currentTransaction })
  }

  public clearRequests() {
    this.recordedRequests = []
    this.pageStepIndex = 1
    this.emit('cleared')
  }

  private sendCdp<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.cdp) return Promise.reject(new Error('CDP WebSocket is not connected.'))
    return this.cdp.send<T>(method, params)
  }

  /** Snapshot of recorder state + callbacks for the CDP event handlers. */
  private eventContext(): CdpEventContext {
    return {
      requests: this.recordedRequests,
      transaction: this.currentTransaction,
      autoPageSplit: this.autoPageSplit,
      maxRequestsInMemory: this.maxRequestsInMemory,
      nextPageStep: () => this.pageStepIndex++,
      setTransaction: (name) => this.setTransaction(name),
      emit: (event, payload) => this.emit(event, payload),
      sendCdp: (method, params) => this.sendCdp(method, params),
    }
  }

  public async startRecording(options: {
    browserType?: 'chrome' | 'edge' | 'custom'
    browserPath?: string
    targetUrl?: string
    initialTransaction?: string
    port?: number
  }): Promise<{ success: boolean; targetUrl: string }> {
    if (this.isRecording) {
      await this.stopRecording()
    }

    const detection = this.detectBrowsers()
    const browserType = options.browserType || 'chrome'
    this.selectedBrowserType = browserType

    const executable = resolveBrowserExecutable(browserType, options.browserPath, detection)

    if (!executable || !existsSync(executable)) {
      throw new Error(`No compatible browser found. Please install Google Chrome or Microsoft Edge.`)
    }

    this.activePort = options.port || (9222 + Math.floor(Math.random() * 500))
    this.tempProfileDir = join(tmpdir(), `jmeter_recorder_profile_${Date.now()}`)
    mkdirSync(this.tempProfileDir, { recursive: true })

    const targetUrl = options.targetUrl && options.targetUrl.trim() ? options.targetUrl.trim() : 'https://google.com'
    this.currentTargetUrl = targetUrl
    this.currentTransaction = options.initialTransaction?.trim() || '01_Open_Application'
    this.recordedRequests = []

    // 1. Launch visible browser window with remote debugging
    const args = buildBrowserLaunchArgs(this.activePort, this.tempProfileDir)

    try {
      this.browserProcess = launchBrowser(executable, args)

      this.browserProcess.on('exit', () => {
        this.stopRecording().catch(() => {})
      })

      const wsUrl = await waitForDebuggerUrl(this.activePort)

      this.cdp = await CdpClient.connect(
        wsUrl,
        (method, params) => handleCdpEvent(this.eventContext(), method, params),
        () => {
          if (this.isRecording) this.stopRecording().catch(() => {})
        },
      )

      // 2. Enable CDP Domains
      await this.sendCdp('Network.enable', NETWORK_ENABLE_PARAMS)
      await this.sendCdp('Page.enable')

      this.isRecording = true
      this.emit('started', { targetUrl, transaction: this.currentTransaction })

      // 3. Navigate to target URL AFTER CDP is fully listening
      if (targetUrl && targetUrl !== 'about:blank') {
        setTimeout(() => {
          this.sendCdp('Page.navigate', { url: targetUrl }).catch(() => {})
        }, 150)
      }

      return { success: true, targetUrl }
    } catch (err) {
      await this.cleanup()
      throw err
    }
  }

  public async stopRecording() {
    this.isRecording = false
    await this.cleanup()
    this.emit('stopped', { count: this.recordedRequests.length })
    return { success: true, count: this.recordedRequests.length }
  }

  private async cleanup() {
    if (this.cdp) {
      this.cdp.close()
      this.cdp = null
    }

    if (this.browserProcess) {
      terminateBrowser(this.browserProcess, () => this.browserProcess)
      this.browserProcess = null
    }

    if (this.tempProfileDir) {
      const dirToDelete = this.tempProfileDir
      this.tempProfileDir = ''
      // Async retry cleanup for Windows file locks
      scheduleProfileDirRemoval(dirToDelete)
    }
  }
}

export const browserRecorder = new BrowserRecorderManager()
