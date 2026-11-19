import type { JMeterDetectionResult, RunSummary, StreamCallbacks } from '../models/jmeterRunner'
import { connectRunnerStream } from './jmeterRunner/stream'

export type {
  JMeterDetectionResult,
  JtlSample,
  RunProgressMetrics,
  RunSummary,
  RunSamplesUpdate,
  StreamCallbacks,
} from '../models/jmeterRunner'

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
    return connectRunnerStream(callbacks)
  },
}
