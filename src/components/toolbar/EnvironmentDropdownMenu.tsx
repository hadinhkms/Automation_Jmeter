import { Check, RefreshCw, Upload } from 'lucide-react'
import type { EnvironmentItem } from '../../store/environmentStore'

interface EnvironmentDropdownMenuProps {
  environments: EnvironmentItem[]
  activeEnvId: string
  feedback: string
  onSelect: (id: string) => void
  onSync: () => void
  onUploadClick: () => void
}

export function EnvironmentDropdownMenu({
  environments,
  activeEnvId,
  feedback,
  onSelect,
  onSync,
  onUploadClick,
}: EnvironmentDropdownMenuProps) {
  return (
    <div
      className="env-dropdown-menu"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 4,
        width: 240,
        background: 'var(--bg-primary, #1e242d)',
        border: '1px solid var(--border, #333d49)',
        borderRadius: 6,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        zIndex: 100,
        padding: '6px 0',
      }}
    >
      <div style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase' }}>
        Environments
      </div>
      {environments.map((env) => (
        <button
          key={env.id}
          type="button"
          onClick={() => onSelect(env.id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            background: env.id === activeEnvId ? 'rgba(59, 130, 246, 0.12)' : 'none',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: 12,
            color: env.id === activeEnvId ? '#38bdf8' : 'inherit',
          }}
        >
          <span>{env.name}</span>
          {env.id === activeEnvId ? <Check size={14} style={{ color: '#38bdf8' }} /> : null}
        </button>
      ))}

      <div style={{ height: 1, background: 'var(--border, #333d49)', margin: '6px 0' }} />

      <button
        type="button"
        onClick={onSync}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: 12,
          color: 'inherit',
        }}
      >
        <RefreshCw size={13} /> Sync Variables to Test Plan (UDV)
      </button>

      <button
        type="button"
        onClick={onUploadClick}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: 12,
          color: 'inherit',
        }}
      >
        <Upload size={13} /> Import Postman Env (.json)
      </button>

      {feedback ? (
        <div style={{ padding: '4px 12px', fontSize: 11, color: '#22c55e', fontStyle: 'italic' }}>
          {feedback}
        </div>
      ) : null}
    </div>
  )
}
