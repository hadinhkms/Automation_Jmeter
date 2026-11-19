import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import type { StatusMessage } from './constants'

interface PluginStatusBannerProps {
  statusMessage: StatusMessage
  onDismiss: () => void
}

export function PluginStatusBanner({ statusMessage, onDismiss }: PluginStatusBannerProps) {
  return (
    <div
      style={{
        padding: '6px 18px',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: statusMessage.type === 'error' ? '#fef2f2' : statusMessage.type === 'success' ? '#f0fdf4' : '#eff6ff',
        color: statusMessage.type === 'error' ? '#991b1b' : statusMessage.type === 'success' ? '#166534' : '#1e40af',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {statusMessage.type === 'error' ? <AlertCircle size={14} /> : statusMessage.type === 'success' ? <CheckCircle2 size={14} /> : <Info size={14} />}
        <span>{statusMessage.text}</span>
      </div>
      <button
        type="button"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
        onClick={onDismiss}
      >
        <X size={13} />
      </button>
    </div>
  )
}
