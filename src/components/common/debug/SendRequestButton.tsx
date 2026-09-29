import { Play, Loader2 } from 'lucide-react'

interface SendRequestButtonProps {
  isSending: boolean
  onSend: () => void
  disabled?: boolean
}

export function SendRequestButton({ isSending, onSend, disabled }: SendRequestButtonProps) {
  return (
    <button
      type="button"
      className="send-btn-active"
      disabled={disabled || isSending}
      onClick={onSend}
      title={disabled ? 'Please enter Server Name or IP' : 'Send single request via proxy to inspect live response'}
      aria-label="Send Request"
    >
      {isSending ? (
        <Loader2 size={13} className="spin-icon" />
      ) : (
        <Play size={13} style={{ fill: '#ffffff', stroke: '#ffffff' }} />
      )}
      <span>{isSending ? 'Sending...' : 'Send Request'}</span>
    </button>
  )
}
