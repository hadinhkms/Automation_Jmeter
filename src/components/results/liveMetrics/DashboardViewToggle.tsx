interface DashboardViewToggleProps {
  viewMode: 'kpi' | 'chart'
  setViewMode: (mode: 'kpi' | 'chart') => void
  pointsCount: number
}

/** View Mode Toggle */
export function DashboardViewToggle({ viewMode, setViewMode, pointsCount }: DashboardViewToggleProps) {
  return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.2)', padding: 3, borderRadius: 6 }}>
          <button
            onClick={() => setViewMode('kpi')}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              background: viewMode === 'kpi' ? '#3b82f6' : 'transparent',
              color: viewMode === 'kpi' ? '#fff' : 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
            }}
          >
            📊 KPI & Summary
          </button>
          <button
            onClick={() => setViewMode('chart')}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              background: viewMode === 'chart' ? '#3b82f6' : 'transparent',
              color: viewMode === 'chart' ? '#fff' : 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
            }}
          >
            📈 Grafana Canvas Charts
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)' }}>
          {pointsCount} points buffered
        </div>
      </div>
  )
}
