import { Folder } from 'lucide-react'
import type { FlatPostmanItem } from '../../../utils/postman/postmanTypes'

interface PostmanItemTreePreviewProps {
  items: FlatPostmanItem[]
  selectedIds: Set<string>
  onToggleItem: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

const methodColors: Record<string, string> = {
  GET: '#60a5fa', POST: '#4ade80', PUT: '#fbbf24', DELETE: '#f87171', PATCH: '#a78bfa',
}

export function PostmanItemTreePreview({
  items, selectedIds, onToggleItem, onSelectAll, onDeselectAll,
}: PostmanItemTreePreviewProps) {
  if (items.length === 0) return null

  const selectedCount = items.filter((it) => !it.isFolder && selectedIds.has(it.id)).length
  const totalCount = items.filter((it) => !it.isFolder).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Selected {selectedCount} of {totalCount} requests</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onSelectAll} style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 11.5 }}>Select All</button>
          <span style={{ color: 'var(--text-muted, #64748b)' }}>|</span>
          <button onClick={onDeselectAll} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11.5 }}>Deselect All</button>
        </div>
      </div>

      <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-color, #334155)', borderRadius: 6, background: 'rgba(0, 0, 0, 0.2)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => {
          if (it.isFolder) {
            return (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', fontSize: 11.5, fontWeight: 700, color: '#93c5fd', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 4, marginTop: 2 }}>
                <Folder size={14} color="#60a5fa" />
                <span>{it.path}</span>
              </div>
            )
          }

          const isChecked = selectedIds.has(it.id)
          const badgeColor = methodColors[it.method?.toUpperCase() || 'GET'] || '#94a3b8'
          return (
            <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'transparent', fontSize: 12 }}>
              <input type="checkbox" checked={isChecked} onChange={() => onToggleItem(it.id)} style={{ cursor: 'pointer' }} />
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(0, 0, 0, 0.3)', color: badgeColor, width: 44, textAlign: 'center' }}>
                {it.method || 'GET'}
              </span>
              <span style={{ color: 'var(--text-color, #e2e8f0)', fontWeight: 500 }}>{it.name}</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted, #94a3b8)', marginLeft: 'auto', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.url}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
