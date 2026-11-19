import { Terminal, X } from 'lucide-react'

export function ImportCurlHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-header">
      <div className="modal-title-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Terminal size={18} className="modal-icon-accent" style={{ color: 'var(--accent, #6366f1)' }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Import from cURL</h3>
        <span
          style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#818cf8',
            fontWeight: 500,
          }}
        >
          Apache JMeter Tools
        </span>
      </div>
      <button
        type="button"
        className="modal-close-btn"
        onClick={onClose}
        aria-label="Close dialog"
      >
        <X size={16} />
      </button>
    </div>
  )
}
