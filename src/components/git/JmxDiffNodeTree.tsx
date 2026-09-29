import { MinusCircle, PlusCircle, RefreshCw } from 'lucide-react'
import type { JmxDiffNode, JmxDiffResult } from '../../services/jmxDiffService'

interface JmxDiffNodeTreeProps {
  diff: JmxDiffResult
  selectedNode: JmxDiffNode | null
  onSelectNode: (node: JmxDiffNode) => void
}

export function JmxDiffNodeTree({ diff, selectedNode, onSelectNode }: JmxDiffNodeTreeProps) {
  const beforeNodes = [...diff.removed, ...diff.changed]
  const afterNodes = [...diff.added, ...diff.changed]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'hidden',
        padding: '0 16px',
      }}
    >
      {/* Before Column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'rgba(0, 0, 0, 0.15)',
          borderRadius: 6,
          border: '1px solid var(--border-color, #334155)',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#f87171',
            borderBottom: '1px solid var(--border-color, #334155)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>BEFORE ({diff.branchA})</span>
          <span>{beforeNodes.length} changes</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {beforeNodes.length === 0 ? (
            <div style={{ padding: 12, fontSize: 11.5, color: 'var(--text-muted, #94a3b8)' }}>No components removed or modified.</div>
          ) : (
            beforeNodes.map((n) => {
              const isRem = diff.removed.some((r) => r.id === n.id)
              const isSel = selectedNode?.id === n.id
              return (
                <div
                  key={n.id}
                  onClick={() => onSelectNode(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    borderRadius: 4,
                    fontSize: 11.5,
                    cursor: 'pointer',
                    background: isSel ? 'rgba(59, 130, 246, 0.25)' : isRem ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: isSel ? '1px solid #3b82f6' : '1px solid transparent',
                  }}
                >
                  {isRem ? <MinusCircle size={14} color="#ef4444" /> : <RefreshCw size={13} color="#f59e0b" />}
                  <span style={{ fontWeight: 600, color: isRem ? '#f87171' : '#fbbf24', textDecoration: isRem ? 'line-through' : 'none' }}>
                    {n.name}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted, #94a3b8)', marginLeft: 'auto' }}>{n.type}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* After Column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'rgba(0, 0, 0, 0.15)',
          borderRadius: 6,
          border: '1px solid var(--border-color, #334155)',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#4ade80',
            borderBottom: '1px solid var(--border-color, #334155)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>AFTER ({diff.branchB})</span>
          <span>{afterNodes.length} changes</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {afterNodes.length === 0 ? (
            <div style={{ padding: 12, fontSize: 11.5, color: 'var(--text-muted, #94a3b8)' }}>No components added or modified.</div>
          ) : (
            afterNodes.map((n) => {
              const isAdd = diff.added.some((a) => a.id === n.id)
              const isSel = selectedNode?.id === n.id
              return (
                <div
                  key={n.id}
                  onClick={() => onSelectNode(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    borderRadius: 4,
                    fontSize: 11.5,
                    cursor: 'pointer',
                    background: isSel ? 'rgba(59, 130, 246, 0.25)' : isAdd ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: isSel ? '1px solid #3b82f6' : '1px solid transparent',
                  }}
                >
                  {isAdd ? <PlusCircle size={14} color="#22c55e" /> : <RefreshCw size={13} color="#f59e0b" />}
                  <span style={{ fontWeight: 600, color: isAdd ? '#4ade80' : '#fbbf24' }}>
                    {n.name}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted, #94a3b8)', marginLeft: 'auto' }}>{n.type}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
