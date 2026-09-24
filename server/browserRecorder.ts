// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { EventEmitter } from 'node:events'
import http from 'node:http'
import WebSocket from 'ws'
import type {
  RecordedRequest,
  RecordedHeader,
  RecordedParam,
  BrowserDetection,
} from '../src/models/recorder'

class BrowserRecorderManager extends EventEmitter {
  private browserProcess: ChildProcess | null = null
  private ws: WebSocket | null = null
  private nextMsgId = 1
  private cdpCallbacks = new Map<number, (res: { error?: { message?: string }; result?: unknown }) => void>()
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

  constructor() {
    super()
  }

  public detectBrowsers(): BrowserDetection {
    const available: Array<{ type: 'chrome' | 'edge' | 'custom'; name: string; path: string }> = []
    const localAppData = process.env.LOCALAPPDATA || ''
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

    const chromeCandidates = [
      join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ]

    const edgeCandidates = [
      join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ]

    let foundChrome: string | undefined
    for (const p of chromeCandidates) {
      if (existsSync(p)) {
        foundChrome = p
        available.push({ type: 'chrome', name: 'Google Chrome', path: p })
        break
      }
    }

    let foundEdge: string | undefined
    for (const p of edgeCandidates) {
      if (existsSync(p)) {
        foundEdge = p
        available.push({ type: 'edge', name: 'Microsoft Edge', path: p })
        break
      }
    }

    return {
      chrome: foundChrome,
      edge: foundEdge,
      available,
    }
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
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('CDP WebSocket is not connected.'))
      }
      const id = this.nextMsgId++
      this.cdpCallbacks.set(id, (res) => {
        if (res.error) {
          reject(new Error(res.error.message || 'CDP Error'))
        } else {
          resolve(res.result as T)
        }
      })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  private parseUrlDetails(urlStr: string) {
    try {
      let toParse = urlStr
      if (!/^https?:\/\//i.test(toParse)) toParse = `https://${toParse}`
      const u = new URL(toParse)
      const queryParams: RecordedParam[] = []
      u.searchParams.forEach((val, key) => {
        queryParams.push({ name: key, value: val, encode: true })
      })
      return {
        protocol: u.protocol.replace(':', '').toLowerCase(),
        server: u.hostname,
        port: u.port || '',
        path: (u.pathname + u.search) || '/',
        cleanPath: u.pathname || '/',
        queryParams,
      }
    } catch {
      const qIdx = urlStr.indexOf('?')
      const cleanPath = qIdx !== -1 ? urlStr.slice(0, qIdx) : urlStr
      return {
        protocol: 'https',
        server: '',
        port: '',
        path: urlStr || '/',
        cleanPath: cleanPath || '/',
        queryParams: [],
      }
    }
  }

  private fetchJson<T = unknown>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      http
        .get(url, (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(data) as T)
            } catch (e) {
              reject(e)
            }
          })
        })
        .on('error', reject)
    })
  }

  private async waitForDebuggerUrl(port: number, retries = 30): Promise<string> {
    for (let i = 0; i < retries; i++) {
      try {
        const list = await this.fetchJson<Array<{ type?: string; webSocketDebuggerUrl?: string }>>(`http://127.0.0.1:${port}/json/list`)
        if (Array.isArray(list) && list.length > 0) {
          const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) || list[0]
          if (page && page.webSocketDebuggerUrl) {
            return page.webSocketDebuggerUrl
          }
        }
      } catch {
        // Wait and retry
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    throw new Error(`Could not connect to Chrome/Edge DevTools on port ${port}. Please ensure browser is not blocked.`)
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

    let executable = options.browserPath
    if (!executable) {
      if (browserType === 'chrome' && detection.chrome) executable = detection.chrome
      else if (browserType === 'edge' && detection.edge) executable = detection.edge
      else if (detection.available.length > 0) executable = detection.available[0].path
    }

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
    const args = [
      `--remote-debugging-port=${this.activePort}`,
      '--remote-allow-origins=*',
      `--user-data-dir=${this.tempProfileDir}`,
      '--new-window',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-default-apps',
      '--window-size=1280,800',
      '--start-maximized',
      'about:blank',
    ]

    try {
      this.browserProcess = spawn(executable, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      })

      this.browserProcess.on('exit', () => {
        this.stopRecording().catch(() => {})
      })

      const wsUrl = await this.waitForDebuggerUrl(this.activePort)

      this.ws = new WebSocket(wsUrl)

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout.')), 6000)
        this.ws!.on('open', () => {
          clearTimeout(timeout)
          resolve()
        })
        this.ws!.on('error', (err: Error) => {
          clearTimeout(timeout)
          reject(err)
        })
      })

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(data.toString())
          if (msg.id && this.cdpCallbacks.has(msg.id)) {
            const cb = this.cdpCallbacks.get(msg.id)!
            this.cdpCallbacks.delete(msg.id)
            cb(msg)
            return
          }

          this.handleCdpEvent(msg.method, msg.params)
        } catch {
          // Ignore parse errors
        }
      })

      this.ws.on('close', () => {
        if (this.isRecording) {
          this.stopRecording().catch(() => {})
        }
      })

      // 2. Enable CDP Domains
      await this.sendCdp('Network.enable', {
        maxTotalBufferSize: 10485760,
        maxResourceBufferSize: 5242880,
        maxPostDataSize: 1048576,
      })
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

  private handleCdpEvent(method: string, params: Record<string, unknown> | undefined) {
    if (!params) return

    if (method === 'Page.frameNavigated') {
      const frame = params.frame as { parentId?: string; url?: string } | undefined
      if (frame && !frame.parentId && frame.url && !frame.url.startsWith('about:') && !frame.url.startsWith('chrome:')) {
        if (this.autoPageSplit) {
          try {
            const u = new URL(frame.url)
            const cleanPath = u.pathname.replace(/^\/|\/$/g, '').replace(/[/_.-]+/g, '_') || 'Home'
            const stepName = `${String(this.pageStepIndex++).padStart(2, '0')}_Page_${cleanPath}`
            this.setTransaction(stepName)
          } catch {
            // Ignore URL parse error
          }
        }
      }
      return
    }

    if (method === 'Page.navigatedWithinDocument') {
      const url = params.url as string | undefined
      if (url && !url.startsWith('about:') && !url.startsWith('chrome:')) {
        if (this.autoPageSplit) {
          try {
            const u = new URL(url)
            const cleanPath = u.pathname.replace(/^\/|\/$/g, '').replace(/[/_.-]+/g, '_') || 'Home'
            const stepName = `${String(this.pageStepIndex++).padStart(2, '0')}_Page_${cleanPath}`
            this.setTransaction(stepName)
          } catch {
            // Ignore URL parse error
          }
        }
      }
      return
    }

    if (method === 'Network.requestWillBeSent') {
      const { requestId, request, timestamp, type, initiator, redirectResponse } = params as {
        requestId: string
        request: { url?: string; method?: string; headers?: Record<string, string>; postData?: string }
        timestamp?: number
        type?: string
        initiator?: { type?: string }
        redirectResponse?: { status?: number; statusText?: string; headers?: Record<string, string> }
      }
      const url = request.url || ''

      // Skip internal browser schemes
      if (
        url.startsWith('data:') ||
        url.startsWith('chrome-extension:') ||
        url.startsWith('edge-extension:') ||
        url.startsWith('blob:') ||
        url.startsWith('devtools:') ||
        url === 'about:blank'
      ) {
        return
      }

      // Handle redirect chain
      if (redirectResponse) {
        const prev = this.recordedRequests.find((r) => r.requestId === requestId)
        if (prev) {
          prev.responseStatus = redirectResponse.status
          prev.responseStatusText = redirectResponse.statusText
          prev.responseHeaders = Object.entries(redirectResponse.headers || {}).map(([name, value]) => ({
            name,
            value: String(value),
          }))
          this.emit('request-updated', prev)
        }
      }

      const parsedUrl = this.parseUrlDetails(url)
      const headers: RecordedHeader[] = Object.entries(request.headers || {}).map(([name, value]) => ({
        name,
        value: String(value),
      }))

      // Parse post data params if form urlencoded
      const postParams: RecordedParam[] = []
      if (request.postData && request.headers && String(request.headers['content-type'] || '').includes('application/x-www-form-urlencoded')) {
        const pairs = request.postData.split('&')
        for (const p of pairs) {
          const [k, v] = p.split('=')
          if (k) {
            postParams.push({
              name: decodeURIComponent(k),
              value: v ? decodeURIComponent(v) : '',
              encode: true,
            })
          }
        }
      }

      const newRecord: RecordedRequest = {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        requestId,
        transaction: this.currentTransaction,
        timestamp: Date.now(),
        url,
        method: (request.method || 'GET').toUpperCase(),
        protocol: parsedUrl.protocol,
        server: parsedUrl.server,
        port: parsedUrl.port,
        path: parsedUrl.path,
        resourceType: type || initiator?.type || 'XHR',
        requestHeaders: headers,
        queryParams: parsedUrl.queryParams.length > 0 ? parsedUrl.queryParams : undefined,
        postParams: postParams.length > 0 ? postParams : undefined,
        postData: request.postData,
        startTime: typeof timestamp === 'number' ? timestamp : Date.now() / 1000,
      }

      // Buffer size cap (max 1000 items)
      if (this.recordedRequests.length >= this.maxRequestsInMemory) {
        this.recordedRequests.shift()
      }

      this.recordedRequests.push(newRecord)
      this.emit('request-added', newRecord)
    } else if (method === 'Network.responseReceived') {
      const { requestId, response, timestamp } = params as {
        requestId: string
        response: { status?: number; statusText?: string; mimeType?: string; headers?: Record<string, string> }
        timestamp?: number
      }
      const record = this.recordedRequests.find((r) => r.requestId === requestId)
      if (record) {
        record.responseStatus = response.status
        record.responseStatusText = response.statusText
        record.mimeType = response.mimeType
        record.responseHeaders = Object.entries(response.headers || {}).map(([name, value]) => ({
          name,
          value: String(value),
        }))
        if (record.startTime && timestamp) {
          record.durationMs = Math.max(1, Math.round((timestamp - record.startTime) * 1000))
        }
        this.emit('request-updated', record)
      }
    } else if (method === 'Network.loadingFinished') {
      const { requestId, encodedDataLength } = params as {
        requestId: string
        encodedDataLength?: number
      }
      const record = this.recordedRequests.find((r) => r.requestId === requestId)
      if (record) {
        record.sizeBytes = encodedDataLength
        record.endTime = Date.now()

        // Fetch response body for text/json/xml/html responses <= 512KB
        if (
          record.mimeType &&
          (record.mimeType.includes('json') ||
            record.mimeType.includes('text') ||
            record.mimeType.includes('xml') ||
            record.mimeType.includes('javascript') ||
            record.mimeType.includes('html'))
        ) {
          this.sendCdp<{ body?: string; base64Encoded?: boolean }>('Network.getResponseBody', { requestId })
            .then((res) => {
              if (res && res.body) {
                let bodyText = res.base64Encoded
                  ? Buffer.from(res.body, 'base64').toString('utf8')
                  : res.body
                if (bodyText.length > 524288) {
                  bodyText = bodyText.slice(0, 524288) + '\n... [Response truncated for memory]'
                }
                record.responseBody = bodyText
                this.emit('request-updated', record)
              }
            })
            .catch(() => {
              // Ignore body fetch failure
            })
        }

        this.emit('request-updated', record)
      }
    } else if (method === 'Network.loadingFailed') {
      const { requestId, errorText } = params as {
        requestId: string
        errorText?: string
      }
      const record = this.recordedRequests.find((r) => r.requestId === requestId)
      if (record) {
        record.error = errorText
        this.emit('request-updated', record)
      }
    }
  }

  public async stopRecording() {
    this.isRecording = false
    await this.cleanup()
    this.emit('stopped', { count: this.recordedRequests.length })
    return { success: true, count: this.recordedRequests.length }
  }

  private async cleanup() {
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // Ignore ws close error
      }
      this.ws = null
    }

    if (this.browserProcess) {
      try {
        this.browserProcess.kill('SIGTERM')
        setTimeout(() => {
          if (this.browserProcess && !this.browserProcess.killed) {
            try {
              this.browserProcess.kill('SIGKILL')
            } catch {
              // Ignore process kill error
            }
          }
        }, 1000)
      } catch {
        // Ignore process term error
      }
      this.browserProcess = null
    }

    if (this.tempProfileDir) {
      const dirToDelete = this.tempProfileDir
      this.tempProfileDir = ''
      // Async retry cleanup for Windows file locks
      setTimeout(() => {
        try {
          if (existsSync(dirToDelete)) {
            rmSync(dirToDelete, { recursive: true, force: true })
          }
        } catch {
          // Retry after 3s if Windows file lock is still releasing
          setTimeout(() => {
            try {
              if (existsSync(dirToDelete)) {
                rmSync(dirToDelete, { recursive: true, force: true })
              }
            } catch {
              // Ignore persistent temp lock
            }
          }, 3000)
        }
      }, 1500)
    }
  }
}

export const browserRecorder = new BrowserRecorderManager()
