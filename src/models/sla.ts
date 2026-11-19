export interface PerformanceMetricsInput {
  totalSamples: number
  errors: number
  errorRate: number
  avgLatency: number
  p90Latency?: number
  p95Latency?: number
  p99Latency?: number
  throughput: number
}
