import type { SlaEvaluationResult, SlaThresholds } from '../models/jmeter'
import type { JtlSample } from '../services/jmeterRunnerService'

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

export function evaluateSla(
  thresholds: SlaThresholds,
  metrics: PerformanceMetricsInput,
): SlaEvaluationResult {
  const rules: SlaEvaluationResult['rules'] = []

  if (thresholds.maxAvgLatencyMs !== undefined && thresholds.maxAvgLatencyMs > 0) {
    const passed = metrics.avgLatency <= thresholds.maxAvgLatencyMs
    rules.push({
      name: 'Avg Latency',
      actual: metrics.avgLatency,
      target: thresholds.maxAvgLatencyMs,
      passed,
      unit: 'ms',
      operator: '<=',
    })
  }

  if (thresholds.maxP90LatencyMs !== undefined && thresholds.maxP90LatencyMs > 0 && metrics.p90Latency !== undefined) {
    const passed = metrics.p90Latency <= thresholds.maxP90LatencyMs
    rules.push({
      name: 'P90 Latency',
      actual: metrics.p90Latency,
      target: thresholds.maxP90LatencyMs,
      passed,
      unit: 'ms',
      operator: '<=',
    })
  }

  if (thresholds.maxP95LatencyMs !== undefined && thresholds.maxP95LatencyMs > 0 && metrics.p95Latency !== undefined) {
    const passed = metrics.p95Latency <= thresholds.maxP95LatencyMs
    rules.push({
      name: 'P95 Latency',
      actual: metrics.p95Latency,
      target: thresholds.maxP95LatencyMs,
      passed,
      unit: 'ms',
      operator: '<=',
    })
  }

  if (thresholds.maxP99LatencyMs !== undefined && thresholds.maxP99LatencyMs > 0 && metrics.p99Latency !== undefined) {
    const passed = metrics.p99Latency <= thresholds.maxP99LatencyMs
    rules.push({
      name: 'P99 Latency',
      actual: metrics.p99Latency,
      target: thresholds.maxP99LatencyMs,
      passed,
      unit: 'ms',
      operator: '<=',
    })
  }

  if (thresholds.maxErrorRatePercent !== undefined && thresholds.maxErrorRatePercent >= 0) {
    const actualErrRate = Number(metrics.errorRate.toFixed(2))
    const passed = actualErrRate <= thresholds.maxErrorRatePercent
    rules.push({
      name: 'Error Rate',
      actual: actualErrRate,
      target: thresholds.maxErrorRatePercent,
      passed,
      unit: '%',
      operator: '<=',
    })
  }

  if (thresholds.minThroughputRps !== undefined && thresholds.minThroughputRps > 0) {
    const actualRps = Number(metrics.throughput.toFixed(1))
    const passed = actualRps >= thresholds.minThroughputRps
    rules.push({
      name: 'Min Throughput',
      actual: actualRps,
      target: thresholds.minThroughputRps,
      passed,
      unit: 'req/s',
      operator: '>=',
    })
  }

  if (thresholds.maxFailedTransactions !== undefined && thresholds.maxFailedTransactions >= 0) {
    const passed = metrics.errors <= thresholds.maxFailedTransactions
    rules.push({
      name: 'Max Failed Samples',
      actual: metrics.errors,
      target: thresholds.maxFailedTransactions,
      passed,
      unit: '',
      operator: '<=',
    })
  }

  const failedRules = rules.filter((r) => !r.passed)
  const allPassed = rules.length > 0 && failedRules.length === 0

  let summaryText = ''
  if (rules.length === 0) {
    summaryText = 'No active SLA thresholds defined.'
  } else if (allPassed) {
    summaryText = `All ${rules.length} SLA quality gate rules passed successfully!`
  } else {
    const failedDescriptions = failedRules.map((r) => `${r.name} (${r.actual}${r.unit} > ${r.target}${r.unit})`).join(', ')
    summaryText = `${failedRules.length}/${rules.length} SLA rules failed: ${failedDescriptions}`
  }

  return {
    passed: allPassed,
    evaluatedAt: Date.now(),
    rules,
    summaryText,
  }
}
