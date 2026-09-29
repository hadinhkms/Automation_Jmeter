import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'

interface ResponseHeadersTableProps {
  headers: Array<{ key: string; value: string }>
}

export function ResponseHeadersTable({ headers }: ResponseHeadersTableProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return headers
    const q = query.toLowerCase()
    return headers.filter(
      (h) => h.key.toLowerCase().includes(q) || h.value.toLowerCase().includes(q),
    )
  }, [headers, query])

  if (headers.length === 0) {
    return <div style={{ color: 'var(--text-secondary, #94a3b8)', padding: 12 }}>No response headers returned.</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Search size={14} style={{ color: 'var(--text-secondary, #94a3b8)' }} />
        <input
          type="text"
          placeholder="Filter headers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            background: 'var(--bg-tertiary, #222933)',
            border: '1px solid var(--border, #333d49)',
            borderRadius: 4,
            color: 'inherit',
            width: 200,
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)' }}>
          ({filtered.length}/{headers.length})
        </span>
      </div>

      <table className="headers-table">
        <thead>
          <tr>
            <th>Header Name</th>
            <th>Header Value</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((h, i) => (
            <tr key={`${h.key}-${i}`}>
              <td className="header-key">{h.key}</td>
              <td className="header-val">{h.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
