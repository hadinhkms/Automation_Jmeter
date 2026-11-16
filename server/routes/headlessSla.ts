import type { JtlSample } from '../jmeterRunner'

export interface RunExecutionSummary {
  runId: string
  status?: 'running' | 'completed' | 'failed' | 'stopped'
  totalSamples?: number
  samples?: JtlSample[]
}

export interface HeadlessStats {
  totalSamples: number
  errors: number
  errorRate: number
  avg: number
  p90: number
  p95: number
}

export function parseWebhookType(type: unknown): 'discord' | 'slack' | 'teams' | 'generic' {
  return type === 'slack' || type === 'teams' || type === 'generic' ? type : 'discord'
}

export function computeHeadlessStats(summary: RunExecutionSummary): HeadlessStats {
  const totalSamples = summary.totalSamples || (summary.samples ? summary.samples.length : 0)
  const errors = summary.samples ? summary.samples.filter((s: JtlSample) => !s.success).length : 0
  const errorRate = totalSamples > 0 ? (errors / totalSamples) * 100 : 0
  const elapseds = summary.samples ? summary.samples.map((s: JtlSample) => s.elapsed).sort((a: number, b: number) => a - b) : []
  const sum = elapseds.reduce((a: number, b: number) => a + b, 0)
  const avg = elapseds.length > 0 ? Math.round(sum / elapseds.length) : 0
  const p90 = elapseds.length > 0 ? elapseds[Math.floor(elapseds.length * 0.9)] || elapseds[elapseds.length - 1] : 0
  const p95 = elapseds.length > 0 ? elapseds[Math.floor(elapseds.length * 0.95)] || elapseds[elapseds.length - 1] : 0
  return { totalSamples, errors, errorRate, avg, p90, p95 }
}

/** Applies the SLA quality-gate thresholds (only when enabled) and returns pass flag + human summary. */
export function evaluateSla(stats: HeadlessStats, slaThresholds: Record<string, unknown>) {
  const { avg, p95, errorRate } = stats
  let slaPassed = true
  const failedRules: string[] = []
  if (slaThresholds && slaThresholds.enabled) {
    if (slaThresholds.maxAvgLatencyMs && avg > Number(slaThresholds.maxAvgLatencyMs)) {
      failedRules.push(`Avg Latency (${avg}ms > ${slaThresholds.maxAvgLatencyMs}ms)`)
    }
    if (slaThresholds.maxP95LatencyMs && p95 > Number(slaThresholds.maxP95LatencyMs)) {
      failedRules.push(`P95 Latency (${p95}ms > ${slaThresholds.maxP95LatencyMs}ms)`)
    }
    if (slaThresholds.maxErrorRatePercent !== undefined && errorRate > Number(slaThresholds.maxErrorRatePercent)) {
      failedRules.push(`Error Rate (${errorRate.toFixed(2)}% > ${slaThresholds.maxErrorRatePercent}%)`)
    }
    slaPassed = failedRules.length === 0
  }

  const slaSummary = failedRules.length === 0 ? 'All SLA Quality Gates passed!' : `SLA Failed: ${failedRules.join(', ')}`
  return { slaPassed, slaSummary }
}
