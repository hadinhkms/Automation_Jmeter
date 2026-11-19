import { Gauge } from 'lucide-react'
import type { DashboardStats } from '../../../models/liveMetrics'

/** Percentiles Row */
export function PercentilesRow({ stats }: { stats: DashboardStats }) {
  return (
      <div style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.03))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)', marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #888)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gauge size={16} color="#8b5cf6" /> Live Response Time Percentiles (SLA Indicators)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>P50 (Median)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#93c5fd', marginTop: 4 }}>{stats.p50} ms</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>P90</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa', marginTop: 4 }}>{stats.p90} ms</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>P95</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f472b6', marginTop: 4 }}>{stats.p95} ms</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>P99</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fb7185', marginTop: 4 }}>{stats.p99} ms</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>Max Peak</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f87171', marginTop: 4 }}>{stats.max} ms</div>
          </div>
        </div>
      </div>
  )
}
