export interface ChartMetricPoint {
  timestamp: number
  tps: number
  avgLatency: number
  p90Latency: number
  p95Latency: number
  errorRate: number
  activeThreads: number
}

export type MetricSeriesKey = 'tps' | 'avgLatency' | 'p95Latency' | 'errorRate' | 'activeThreads'

export interface SeriesConfig {
  key: MetricSeriesKey
  label: string
  color: string
  unit: string
  visible: boolean
}

export const DEFAULT_SERIES_CONFIG: SeriesConfig[] = [
  { key: 'tps', label: 'Throughput (TPS)', color: '#34d399', unit: 'req/s', visible: true },
  { key: 'avgLatency', label: 'Avg Latency', color: '#fbbf24', unit: 'ms', visible: true },
  { key: 'p95Latency', label: 'P95 Latency', color: '#f87171', unit: 'ms', visible: false },
  { key: 'errorRate', label: 'Error Rate', color: '#ef4444', unit: '%', visible: true },
  { key: 'activeThreads', label: 'Active Threads', color: '#60a5fa', unit: 'threads', visible: true },
]

export const MAX_CHART_POINTS = 300
