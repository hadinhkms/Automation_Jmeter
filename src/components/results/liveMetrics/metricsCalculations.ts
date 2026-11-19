import type { JtlSample } from '../../../../server/jmeterRunner'
import type { DashboardStats, RunMetricsSnapshot, SlowestRow, TrendPoint } from '../../../models/liveMetrics'

// Compute percentiles and latency stats
export function computeStats(samples: JtlSample[], runMetrics?: RunMetricsSnapshot): DashboardStats {
  if (!samples || samples.length === 0) {
    return {
      total: 0,
      errors: 0,
      errorRate: 0,
      avg: 0,
      min: 0,
      max: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      throughput: runMetrics?.throughput || 0,
      code2xx: 0,
      code3xx: 0,
      code4xx: 0,
      code5xx: 0,
      otherCodes: 0,
    }
  }

  const total = samples.length
  const errors = samples.filter((s) => !s.success).length
  const errorRate = total > 0 ? (errors / total) * 100 : 0

  const sortedElapsed = [...samples.map((s) => s.elapsed)].sort((a, b) => a - b)
  const sum = sortedElapsed.reduce((acc, v) => acc + v, 0)
  const avg = Math.round(sum / total)
  const min = sortedElapsed[0] ?? 0
  const max = sortedElapsed[sortedElapsed.length - 1] ?? 0

  const getPercentile = (p: number) => {
    const idx = Math.min(Math.floor((p / 100) * sortedElapsed.length), sortedElapsed.length - 1)
    return sortedElapsed[idx] ?? 0
  }

  let code2xx = 0
  let code3xx = 0
  let code4xx = 0
  let code5xx = 0
  let otherCodes = 0

  samples.forEach((s) => {
    const c = Number(s.code)
    if (c >= 200 && c < 300) code2xx++
    else if (c >= 300 && c < 400) code3xx++
    else if (c >= 400 && c < 500) code4xx++
    else if (c >= 500 && c < 600) code5xx++
    else otherCodes++
  })

  return {
    total,
    errors,
    errorRate,
    avg,
    min,
    max,
    p50: getPercentile(50),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
    throughput: runMetrics?.throughput || (total / Math.max(1, runMetrics?.durationSeconds || 1)),
    code2xx,
    code3xx,
    code4xx,
    code5xx,
    otherCodes,
  }
}

// Top slowest samplers
export function computeTopSlowest(samples: JtlSample[]): SlowestRow[] {
  const labelMap = new Map<string, { label: string; count: number; totalElapsed: number; errors: number; maxElapsed: number }>()

  samples.forEach((s) => {
    const entry = labelMap.get(s.label) || { label: s.label, count: 0, totalElapsed: 0, errors: 0, maxElapsed: 0 }
    entry.count++
    entry.totalElapsed += s.elapsed
    entry.maxElapsed = Math.max(entry.maxElapsed, s.elapsed)
    if (!s.success) entry.errors++
    labelMap.set(s.label, entry)
  })

  return Array.from(labelMap.values())
    .map((e) => ({
      label: e.label,
      count: e.count,
      avg: Math.round(e.totalElapsed / e.count),
      max: e.maxElapsed,
      errorRate: ((e.errors / e.count) * 100).toFixed(1),
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
}

// SVG Trend Points
export function computeTrendPoints(samples: JtlSample[]): TrendPoint[] {
  if (samples.length === 0) return []
  const bucketCount = Math.min(40, samples.length)
  const bucketSize = Math.max(1, Math.floor(samples.length / bucketCount))
  const pts: TrendPoint[] = []

  for (let i = 0; i < samples.length; i += bucketSize) {
    const slice = samples.slice(i, i + bucketSize)
    if (slice.length === 0) continue
    const elapseds = slice.map((s) => s.elapsed).sort((a, b) => a - b)
    const sum = elapseds.reduce((a, b) => a + b, 0)
    const avg = Math.round(sum / elapseds.length)
    const p95 = elapseds[Math.floor(elapseds.length * 0.95)] || elapseds[elapseds.length - 1]
    pts.push({ x: i, avg, p95 })
  }
  return pts
}
