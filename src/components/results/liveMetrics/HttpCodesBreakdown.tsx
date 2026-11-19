import type { DashboardStats } from '../../../models/liveMetrics'

/** HTTP Status Breakdown */
export function HttpCodesBreakdown({ stats }: { stats: DashboardStats }) {
  return (
        <div style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.03))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 600 }}>HTTP Response Codes</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: '#34d399' }}>2xx Success</span>
                <span>{stats.code2xx} ({stats.total > 0 ? ((stats.code2xx / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.total > 0 ? (stats.code2xx / stats.total) * 100 : 0}%`, background: '#10b981' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: '#60a5fa' }}>3xx Redirect</span>
                <span>{stats.code3xx} ({stats.total > 0 ? ((stats.code3xx / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.total > 0 ? (stats.code3xx / stats.total) * 100 : 0}%`, background: '#3b82f6' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: '#fbbf24' }}>4xx Client Error</span>
                <span>{stats.code4xx} ({stats.total > 0 ? ((stats.code4xx / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.total > 0 ? (stats.code4xx / stats.total) * 100 : 0}%`, background: '#f59e0b' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: '#f87171' }}>5xx Server Error</span>
                <span>{stats.code5xx} ({stats.total > 0 ? ((stats.code5xx / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.total > 0 ? (stats.code5xx / stats.total) * 100 : 0}%`, background: '#ef4444' }} />
              </div>
            </div>
          </div>
        </div>
  )
}
