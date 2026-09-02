import type { BrowserDetection, RecordedRequest } from '../models/recorder'

export interface RecorderStatus {
  isRecording: boolean
  currentTransaction: string
  requestCount: number
  targetUrl: string
  browserType: 'chrome' | 'edge' | 'custom'
  autoPageSplit?: boolean
  requests: RecordedRequest[]
}

export interface RecorderStreamCallbacks {
  onRequestAdded?: (request: RecordedRequest) => void
  onRequestUpdated?: (request: RecordedRequest) => void
  onStarted?: (data: { targetUrl: string; transaction: string }) => void
  onStopped?: (data: { count: number }) => void
  onCleared?: () => void
  onTransactionChanged?: (data: { transaction: string }) => void
  onConnected?: (data: { status: RecorderStatus }) => void
  onError?: (error: string) => void
}

class BrowserRecorderService {
  private eventSource: EventSource | null = null

  public async getAvailableBrowsers(): Promise<BrowserDetection> {
    const res = await fetch('/api/jmeter/recorder/browsers')
    if (!res.ok) throw new Error('Failed to query available browsers')
    return res.json()
  }

  public async getStatus(): Promise<RecorderStatus> {
    const res = await fetch('/api/jmeter/recorder/status')
    if (!res.ok) throw new Error('Failed to get recorder status')
    return res.json()
  }

  public async startRecording(options: {
    browserType?: 'chrome' | 'edge' | 'custom'
    browserPath?: string
    targetUrl?: string
    initialTransaction?: string
    autoPageSplit?: boolean
    port?: number
  }): Promise<{ success: boolean; targetUrl: string }> {
    const res = await fetch('/api/jmeter/recorder/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to start browser recording')
    }
    return data
  }

  public async stopRecording(): Promise<{ success: boolean; count: number }> {
    const res = await fetch('/api/jmeter/recorder/stop', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to stop browser recording')
    }
    return data
  }

  public async setTransaction(name: string): Promise<{ success: boolean; transaction: string }> {
    const res = await fetch('/api/jmeter/recorder/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to set transaction name')
    }
    return data
  }

  public async clearRecorded(): Promise<{ success: boolean }> {
    const res = await fetch('/api/jmeter/recorder/clear', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to clear recorded requests')
    }
    return data
  }

  public connectStream(callbacks: RecorderStreamCallbacks): () => void {
    if (this.eventSource) {
      this.eventSource.close()
    }

    const es = new EventSource('/api/jmeter/recorder/stream')
    this.eventSource = es

    const safeParse = <T>(data: string): T | null => {
      try {
        return JSON.parse(data) as T
      } catch {
        return null
      }
    }

    es.addEventListener('connected', (e) => {
      const data = safeParse<{ status: RecorderStatus }>(e.data)
      if (data) callbacks.onConnected?.(data)
    })

    es.addEventListener('request-added', (e) => {
      const data = safeParse<RecordedRequest>(e.data)
      if (data) callbacks.onRequestAdded?.(data)
    })

    es.addEventListener('request-updated', (e) => {
      const data = safeParse<RecordedRequest>(e.data)
      if (data) callbacks.onRequestUpdated?.(data)
    })

    es.addEventListener('started', (e) => {
      const data = safeParse<{ targetUrl: string; transaction: string }>(e.data)
      if (data) callbacks.onStarted?.(data)
    })

    es.addEventListener('stopped', (e) => {
      const data = safeParse<{ count: number }>(e.data)
      if (data) callbacks.onStopped?.(data)
    })

    es.addEventListener('cleared', () => {
      callbacks.onCleared?.()
    })

    es.addEventListener('transaction-changed', (e) => {
      const data = safeParse<{ transaction: string }>(e.data)
      if (data) callbacks.onTransactionChanged?.(data)
    })

    es.onerror = () => {
      callbacks.onError?.('Lost connection to live browser recorder stream.')
    }

    return () => {
      es.close()
      if (this.eventSource === es) {
        this.eventSource = null
      }
    }
  }
}

export const browserRecorderService = new BrowserRecorderService()
