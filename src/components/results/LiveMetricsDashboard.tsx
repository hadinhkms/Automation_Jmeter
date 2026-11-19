import { useState } from 'react'
import { ResultsChart } from './charts/ResultsChart'
import type { LiveMetricsDashboardProps } from '../../models/liveMetrics'
import { useLiveMetrics } from './liveMetrics/useLiveMetrics'
import { SlaStatusBanner } from './liveMetrics/SlaStatusBanner'
import { DashboardViewToggle } from './liveMetrics/DashboardViewToggle'
import { KpiCards } from './liveMetrics/KpiCards'
import { PercentilesRow } from './liveMetrics/PercentilesRow'
import { LatencyTimelineChart } from './liveMetrics/LatencyTimelineChart'
import { HttpCodesBreakdown } from './liveMetrics/HttpCodesBreakdown'
import { TopSlowestTable } from './liveMetrics/TopSlowestTable'

export function LiveMetricsDashboard({
  samples,
  runMetrics,
  slaThresholds,
  isRunning = false,
}: LiveMetricsDashboardProps) {
  const [viewMode, setViewMode] = useState<'kpi' | 'chart'>('kpi')
  const { stats, topSlowest, slaResult, trendPoints, maxChartLatency, chartPoints } = useLiveMetrics(
    samples,
    runMetrics,
    slaThresholds
  )

  return (
    <div className="live-metrics-dashboard" style={{ padding: '16px 20px', height: '100%', overflowY: 'auto' }}>
      {slaResult && <SlaStatusBanner slaResult={slaResult} />}

      <DashboardViewToggle viewMode={viewMode} setViewMode={setViewMode} pointsCount={chartPoints.length} />

      {viewMode === 'chart' ? (
        <div style={{ marginBottom: 16 }}>
          <ResultsChart points={chartPoints} />
        </div>
      ) : (
        <>
          <KpiCards stats={stats} runMetrics={runMetrics} isRunning={isRunning} />

          <PercentilesRow stats={stats} />

          {/* Latency Timeline & HTTP Codes */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 16 }}>
            <LatencyTimelineChart trendPoints={trendPoints} maxChartLatency={maxChartLatency} />
            <HttpCodesBreakdown stats={stats} />
          </div>

          {topSlowest.length > 0 && <TopSlowestTable topSlowest={topSlowest} />}
        </>
      )}
    </div>
  )
}
