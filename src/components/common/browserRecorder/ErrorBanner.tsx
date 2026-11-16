import { X, AlertCircle } from 'lucide-react'
import * as S from '../../../features/browserRecorder/recorderStyles'

interface ErrorBannerProps {
  message: string | null
  onDismiss: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null
  return (
    <div style={S.errorBar}>
      <div style={S.row('8px')}>
        <AlertCircle size={15} />
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
