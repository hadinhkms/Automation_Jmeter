import { Boxes, Folder, RefreshCw, X } from 'lucide-react'

interface PluginsHeaderProps {
  jmeterHome?: string | null
  loadState: () => void
  isLoading: boolean
  isProcessing: boolean
  onClose: () => void
}

export function PluginsHeader({ jmeterHome, loadState, isLoading, isProcessing, onClose }: PluginsHeaderProps) {
  return (
    <>
      {/* Modal Header */}
      <div className="modal-header" style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '6px', borderRadius: '6px', display: 'flex' }}>
            <Boxes size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>JMeter Plugins Manager</h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Scan, install, and manage official & custom Apache JMeter extension plugins
            </span>
          </div>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close modal"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* JMeter Location Banner */}
      <div style={{ background: '#f8fafc', padding: '6px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Folder size={14} style={{ flexShrink: 0 }} />
          <span>JMeter Directory:</span>
          <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: '3px', color: '#0f172a', fontWeight: 600 }}>
            {jmeterHome || 'Not detected (running in mock mode)'}
          </code>
        </div>
        <button
          type="button"
          className="tool-text-button"
          onClick={loadState}
          disabled={isLoading || isProcessing}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px' }}
        >
          <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
          Refresh
        </button>
      </div>
    </>
  )
}
