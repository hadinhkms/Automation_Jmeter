import { AlertCircle, Square, X } from 'lucide-react'
import type { RunState } from '../models/jmeter'
import type { AppNotice } from './appTypes'

export function NoticeBanner({
  notice,
  runState,
  onForceStop,
  onDismiss,
}: {
  notice: AppNotice
  runState: RunState
  onForceStop: () => void
  onDismiss: () => void
}) {
  return (
    <div className={`notice-banner ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
      <div className="notice-banner-text">
        <AlertCircle size={15} style={{ flexShrink: 0 }} />
        <span>{notice.message}</span>
      </div>
      {notice.message.includes('already running') || notice.message.includes('is running') || runState === 'RUNNING' ? (
        <button
          type="button"
          className="notice-action-btn btn-force-stop"
          onClick={onForceStop}
        >
          <Square size={12} fill="currentColor" />
          Force Stop & Reset
        </button>
      ) : null}
      <button
        type="button"
        className="notice-close-btn"
        aria-label="Dismiss notification"
        title="Dismiss"
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
    </div>
  )
}
