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

export interface ParsedJtl {
  samples: JtlSample[]
  summaryRows: string[][]
  aggregateRows: string[][]
  errorRate: number
}

export const LIVE_RESULTS_POLL_MS = 1000
export const LIVE_SUCCESS_SAMPLE_INTERVAL = 50
export const LIVE_SAMPLE_DETAIL_CAP = 500
export const FINAL_SAMPLE_DETAIL_CAP = 5000
export const DEFAULT_HEAP = '-Xms128m -Xmx512m -XX:MaxMetaspaceSize=256m'
