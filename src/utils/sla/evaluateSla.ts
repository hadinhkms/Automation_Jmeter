import type { SlaEvaluationResult, SlaThresholds } from '../../models/jmeter'
import type { PerformanceMetricsInput } from '../../models/sla'
import { buildSlaRules } from './slaRules'

export function evaluateSla(
  thresholds: SlaThresholds,
  metrics: PerformanceMetricsInput,
): SlaEvaluationResult {
  const rules = buildSlaRules(thresholds, metrics)

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
