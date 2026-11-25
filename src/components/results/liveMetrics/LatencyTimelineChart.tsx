import type { TrendPoint } from '../../../models/liveMetrics'

/** Timeline Chart (Avg vs P95) */
export function LatencyTimelineChart({ trendPoints, maxChartLatency }: { trendPoints: TrendPoint[]; maxChartLatency: number }) {
  return (
        <div style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.03))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Response Time Timeline (Avg vs P95)</h4>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>● Avg Latency</span>
              <span style={{ color: '#f472b6', display: 'flex', alignItems: 'center', gap: 4 }}>● P95 Latency</span>
            </div>
          </div>

          <svg viewBox="0 0 500 160" style={{ width: '100%', height: 160, overflow: 'visible' }}>
            <line x1="40" y1="15" x2="490" y2="15" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <line x1="40" y1="75" x2="490" y2="75" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <line x1="40" y1="135" x2="490" y2="135" stroke="rgba(255,255,255,0.2)" />
            <line x1="40" y1="10" x2="40" y2="135" stroke="rgba(255,255,255,0.2)" />

            <text x="32" y="19" fill="#888" fontSize="10" textAnchor="end">{maxChartLatency}</text>
            <text x="32" y="79" fill="#888" fontSize="10" textAnchor="end">{Math.round(maxChartLatency / 2)}</text>
            <text x="32" y="138" fill="#888" fontSize="10" textAnchor="end">0</text>

            {trendPoints.length > 1 && (
              <>
                {/* P95 Line */}
                <path
                  d={trendPoints.map((p, i) => {
                    const x = 40 + (i / (trendPoints.length - 1)) * 450
                    const y = 135 - (p.p95 / maxChartLatency) * 120
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="#f472b6"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />

                {/* Avg Line */}
                <path
                  d={trendPoints.map((p, i) => {
                    const x = 40 + (i / (trendPoints.length - 1)) * 450
                    const y = 135 - (p.avg / maxChartLatency) * 120
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                />
              </>
            )}
          </svg>
        </div>
  )
}
