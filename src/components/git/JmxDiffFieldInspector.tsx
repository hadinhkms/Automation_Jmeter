import { ArrowRight, Layers } from 'lucide-react'
import type { JmxDiffNode } from '../../services/jmxDiffService'

interface JmxDiffFieldInspectorProps {
  selectedNode: JmxDiffNode | null
}

export function JmxDiffFieldInspector({ selectedNode }: JmxDiffFieldInspectorProps) {
  if (!selectedNode) {
    return (
      <div
        style={{
          padding: 16,
          textAlign: 'center',
          color: 'var(--text-muted, #94a3b8)',
          fontSize: 12,
          borderTop: '1px solid var(--border-color, #334155)',
        }}
      >
        Click a modified component to inspect property differences
      </div>
    )
  }

  const fields = selectedNode.fields || []

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-color, #334155)',
        padding: '12px 16px',
        background: 'var(--bg-secondary, rgba(15, 23, 42, 0.6))',
        maxHeight: 180,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-color, #e2e8f0)',
        }}
      >
        <Layers size={14} color="#f59e0b" />
        <span>Modified Properties: {selectedNode.name}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
          ({selectedNode.type})
        </span>
      </div>

      {fields.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
          No specific property changes recorded.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fields.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 24px 1fr',
                alignItems: 'center',
                gap: 8,
                fontSize: 11.5,
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '4px 8px',
                borderRadius: 4,
                fontFamily: 'monospace',
              }}
            >
              <span style={{ color: '#93c5fd', fontWeight: 600 }}>{f.key}</span>
              <span style={{ color: '#f87171', textDecoration: 'line-through' }}>
                {f.before}
              </span>
              <ArrowRight size={12} color="#94a3b8" />
              <span style={{ color: '#4ade80', fontWeight: 600 }}>{f.after}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
