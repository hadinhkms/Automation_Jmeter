import { useEffect, useMemo, useState } from 'react'
import type { JtlSample } from '../../../../server/jmeterRunner'
import type { SlaEvaluationResult, SlaThresholds } from '../../../models/jmeter'
import { evaluateSla } from '../../../utils/slaEvaluator'
import { type ChartMetricPoint, MAX_CHART_POINTS } from '../charts/chartTypes'
import { computeStats, computeTopSlowest, computeTrendPoints } from './metricsCalculations'
import type { RunMetricsSnapshot } from '../../../models/liveMetrics'

/** Derived dashboard stats plus the rolling chart point buffer. */
export function useLiveMetrics(samples: JtlSample[], runMetrics?: RunMetricsSnapshot, slaThresholds?: SlaThresholds) {
  const [chartPoints, setChartPoints] = useState<ChartMetricPoint[]>([])

  const stats = useMemo(() => computeStats(samples, runMetrics), [samples, runMetrics])

  const topSlowest = useMemo(() => computeTopSlowest(samples), [samples])

  // Evaluate SLA if enabled
  const slaResult: SlaEvaluationResult | null = useMemo(() => {
    if (!slaThresholds || !slaThresholds.enabled || samples.length === 0) return null
    return evaluateSla(slaThresholds, {
      totalSamples: stats.total,
      errors: stats.errors,
      errorRate: stats.errorRate,
      avgLatency: stats.avg,
      p90Latency: stats.p90,
      p95Latency: stats.p95,
      p99Latency: stats.p99,
      throughput: stats.throughput,
    })
  }, [slaThresholds, samples.length, stats])

  const trendPoints = useMemo(() => computeTrendPoints(samples), [samples])

  const maxChartLatency = Math.max(...trendPoints.map((p) => Math.max(p.avg, p.p95)), 10)

  useEffect(() => {
    if (!runMetrics && (!samples || samples.length === 0)) return
    const pt: ChartMetricPoint = {
      timestamp: Date.now(),
      tps: runMetrics?.throughput || stats.throughput,
      avgLatency: stats.avg,
      p90Latency: stats.p90,
      p95Latency: stats.p95,
      errorRate: stats.errorRate,
      activeThreads: runMetrics?.activeThreads || 0,
    }
    setChartPoints((prev) => {
      const next = [...prev, pt]
      return next.length > MAX_CHART_POINTS ? next.slice(next.length - MAX_CHART_POINTS) : next
    })
  }, [runMetrics, samples, stats])

  return { stats, topSlowest, slaResult, trendPoints, maxChartLatency, chartPoints }
}
