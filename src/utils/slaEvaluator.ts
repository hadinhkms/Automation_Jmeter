import type { SlaEvaluationResult, SlaThresholds } from '../models/jmeter'
import type { JtlSample } from '../services/jmeterRunnerService'
import { evaluateSla } from './sla/evaluateSla'

export type { PerformanceMetricsInput } from '../models/sla'
export { evaluateSla }

export function evaluateSamplesSla(
  thresholds: SlaThresholds,
  samples: JtlSample[],
  summaryRows: string[][] = [],
): SlaEvaluationResult {
  const totalSamples = samples.length
  const errors = samples.filter((s) => !s.success).length
  const errorRate = totalSamples > 0 ? (errors / totalSamples) * 100 : 0
  const elapseds = samples.map((s) => s.elapsed).sort((a, b) => a - b)
  const sum = elapseds.reduce((a, b) => a + b, 0)
  const avgLatency = elapseds.length > 0 ? Math.round(sum / elapseds.length) : 0
  const p90Latency = elapseds.length > 0 ? elapseds[Math.floor(elapseds.length * 0.9)] || elapseds[elapseds.length - 1] : 0
  const p95Latency = elapseds.length > 0 ? elapseds[Math.floor(elapseds.length * 0.95)] || elapseds[elapseds.length - 1] : 0
  const p99Latency = elapseds.length > 0 ? elapseds[Math.floor(elapseds.length * 0.99)] || elapseds[elapseds.length - 1] : 0

  let throughput = 0
  if (summaryRows.length > 0) {
    const totalRow = summaryRows.find((r) => r[0] === 'TOTAL') || summaryRows[summaryRows.length - 1]
    if (totalRow && totalRow[7]) {
      throughput = parseFloat(totalRow[7]) || 0
    }
  }
  if (!throughput && totalSamples > 0) {
    throughput = totalSamples / Math.max(1, 10)
  }

  return evaluateSla(thresholds, {
    totalSamples,
    errors,
    errorRate,
    avgLatency,
    p90Latency,
    p95Latency,
    p99Latency,
    throughput,
  })
}
