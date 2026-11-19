import type { SlowestRow } from '../../../models/liveMetrics'

/** Top Slowest Requests Table */
export function TopSlowestTable({ topSlowest }: { topSlowest: SlowestRow[] }) {
  return (
        <div style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.03))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 600 }}>Top Slowest Transactions</h4>
          <table className="results-table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color, #444)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Transaction / Sampler</th>
                <th style={{ padding: '6px 8px' }}>Count</th>
                <th style={{ padding: '6px 8px' }}>Avg Latency</th>
                <th style={{ padding: '6px 8px' }}>Max Latency</th>
                <th style={{ padding: '6px 8px' }}>Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {topSlowest.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 500 }}>{row.label}</td>
                  <td style={{ padding: '6px 8px' }}>{row.count}</td>
                  <td style={{ padding: '6px 8px', color: '#fbbf24' }}>{row.avg} ms</td>
                  <td style={{ padding: '6px 8px', color: '#f87171' }}>{row.max} ms</td>
                  <td style={{ padding: '6px 8px', color: Number(row.errorRate) > 0 ? '#ef4444' : '#10b981' }}>
                    {row.errorRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  )
}
