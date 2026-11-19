import { Activity, AlertTriangle, Clock, Zap } from 'lucide-react'
import type { DashboardStats, RunMetricsSnapshot } from '../../../models/liveMetrics'

interface KpiCardsProps {
  stats: DashboardStats
  runMetrics?: RunMetricsSnapshot
  isRunning: boolean
}

/** Top 4 KPI Cards */
export function KpiCards({ stats, runMetrics, isRunning }: KpiCardsProps) {
  return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="metrics-card" style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.04))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted, #888)' }}>
            <span>Total Requests</span>
            <Activity size={16} color="#60a5fa" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: '#93c5fd' }}>
            {stats.total.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>
            {isRunning ? 'ðŸŸ¢ Stream live executing...' : 'Completed samples'}
          </div>
        </div>

        <div className="metrics-card" style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.04))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted, #888)' }}>
            <span>Throughput (RPS)</span>
            <Zap size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: '#34d399' }}>
            {stats.throughput.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 400 }}>req/s</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>
            Duration: {runMetrics?.durationSeconds || 0}s
          </div>
        </div>

        <div className="metrics-card" style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.04))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted, #888)' }}>
            <span>Avg Latency (ms)</span>
            <Clock size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: '#fbbf24' }}>
            {stats.avg} <span style={{ fontSize: 13, fontWeight: 400 }}>ms</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>
            Min: {stats.min}ms | Max: {stats.max}ms
          </div>
        </div>

        <div className="metrics-card" style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.04))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted, #888)' }}>
            <span>Error Rate</span>
            <AlertTriangle size={16} color={stats.errorRate > 0 ? '#ef4444' : '#10b981'} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: stats.errorRate > 0 ? '#f87171' : '#34d399' }}>
            {stats.errorRate.toFixed(2)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>
            {stats.errors} failed / {stats.total} total
          </div>
        </div>
      </div>
  )
}
