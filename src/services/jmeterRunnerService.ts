// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
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

export interface StreamCallbacks {
  onStart?: (data: { runId: string; jmxPath?: string }) => void
  onLog?: (line: string, type: 'stdout' | 'stderr') => void
  onProgress?: (metrics: RunProgressMetrics) => void
  onSamples?: (update: RunSamplesUpdate) => void
  onComplete?: (summary: RunSummary) => void
  onStopped?: () => void
  onError?: (error: string) => void
}

export const jmeterRunnerService = {
  async detectJMeter(): Promise<JMeterDetectionResult> {
    try {
      const res = await fetch('/api/jmeter/detect')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return {
        found: false,
        path: null,
        version: null,
        error: err instanceof Error ? err.message : 'Could not contact backend API.',
      }
    }
  },

  async saveConfig(path: string): Promise<{ success: boolean; detection: JMeterDetectionResult }> {
    const res = await fetch('/api/jmeter/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return await res.json()
  },

  async startRun(
    jmx: string,
    name = 'test_plan',
    options?: { remoteHosts?: string[] | string },
  ): Promise<{ success: boolean; runId: string }> {
    const res = await fetch('/api/jmeter/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jmx, name, remoteHosts: options?.remoteHosts }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to start JMeter execution.')
    }
    return await res.json()
  },

  async stopRun(): Promise<{ success: boolean }> {
    const res = await fetch('/api/jmeter/stop', { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  },

  async getStatus(): Promise<{ isRunning: boolean; currentRunId: string | null; logs: Array<{ line: string; type: 'stdout' | 'stderr' }>; lastSummary: RunSummary | null }> {
    try {
      const res = await fetch('/api/jmeter/status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch {
      return { isRunning: false, currentRunId: null, logs: [], lastSummary: null }
    }
  },

  async getResults(runId?: string): Promise<RunSummary | null> {
    const url = runId ? `/api/jmeter/results?runId=${encodeURIComponent(runId)}` : '/api/jmeter/results'
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  },

  getReportUrl(runId?: string): string {
    return runId ? `/api/jmeter/report/${encodeURIComponent(runId)}/index.html` : '/api/jmeter/report/index.html'
  },

  connectStream(callbacks: StreamCallbacks): () => void {
    if (typeof EventSource === 'undefined') {
      return () => {}
    }

    const es = new EventSource('/api/jmeter/stream')

    es.addEventListener('start', (event) => {
      try {
        const data = JSON.parse(event.data)
        callbacks.onStart?.(data)
      } catch {
        // ignore
      }
    })

    es.addEventListener('log', (event) => {
      try {
        const data = JSON.parse(event.data)
        callbacks.onLog?.(data.line, data.type)
      } catch {
        // ignore
      }
    })

    es.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data)
        callbacks.onProgress?.(data.metrics)
      } catch {
        // ignore
      }
    })

    es.addEventListener('samples', (event) => {
      try {
        const data = JSON.parse(event.data)
        callbacks.onSamples?.(data)
      } catch {
        // ignore
      }
    })

    es.addEventListener('complete', (event) => {
      try {
        const data = JSON.parse(event.data)
        callbacks.onComplete?.(data)
      } catch {
        // ignore
      }
    })

    es.addEventListener('stopped', () => {
      callbacks.onStopped?.()
    })

    es.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data)
        callbacks.onError?.(data.error || 'Runner stream error')
      } catch {
        // ignore
      }
    })

    return () => {
      es.close()
    }
  },
}
