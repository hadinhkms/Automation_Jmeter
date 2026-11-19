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
