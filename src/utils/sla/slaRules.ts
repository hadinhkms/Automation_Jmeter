import type { SlaEvaluationResult, SlaThresholds } from '../../models/jmeter'
import type { PerformanceMetricsInput } from '../../models/sla'

export function buildSlaRules(
  thresholds: SlaThresholds,
  metrics: PerformanceMetricsInput,
): SlaEvaluationResult['rules'] {
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
    const actualErrRate = Number((metrics.errorRate ?? 0).toFixed(2))
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
    const actualRps = Number((metrics.throughput ?? 0).toFixed(1))
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

  return rules
}
