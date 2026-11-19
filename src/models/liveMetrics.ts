import type { JtlSample } from '../../server/jmeterRunner'
import type { SlaThresholds } from './jmeter'

export interface RunMetricsSnapshot {
  samples: number
  errors: number
  throughput: number
  activeThreads: number
  durationSeconds: number
}

export interface LiveMetricsDashboardProps {
  samples: JtlSample[]
  summaryRows?: string[][]
  aggregateRows?: string[][]
  runMetrics?: RunMetricsSnapshot
  slaThresholds?: SlaThresholds
  isRunning?: boolean
}

export interface DashboardStats {
  total: number
  errors: number
  errorRate: number
  avg: number
  min: number
  max: number
  p50: number
  p90: number
  p95: number
  p99: number
  throughput: number
  code2xx: number
  code3xx: number
  code4xx: number
  code5xx: number
  otherCodes: number
}

export interface SlowestRow {
  label: string
  count: number
  avg: number
  max: number
  errorRate: string
}

export interface TrendPoint {
  x: number
  avg: number
  p95: number
}
