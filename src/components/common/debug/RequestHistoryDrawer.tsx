import { useState } from 'react'
import { History, RotateCcw, Trash2, X } from 'lucide-react'
import { HISTORY_LIMIT, type HistoryEntry } from '../../../services/historyStorageService'
import { formatRelativeTime, statusTone } from '../../../utils/debug/historyRestore'
import { useRequestHistory } from './useRequestHistory'
import './requestHistory.css'

interface RequestHistoryDrawerProps {
  nodeId: string
  nodeName: string
  onRestore: (entry: HistoryEntry) => void
  onClose: () => void
}

export function RequestHistoryDrawer({ nodeId, nodeName, onRestore, onClose }: RequestHistoryDrawerProps) {
  const { entries, loading, error, remove, clear } = useRequestHistory(true)
  const [onlyThis, setOnlyThis] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const visible = onlyThis ? entries.filter((e) => e.nodeId === nodeId) : entries

  const restore = (entry: HistoryEntry) => {
    if (window.confirm(`Overwrite URL, method and body of "${nodeName}" with this ${entry.method} request?`)) onRestore(entry)
  }

  return (
    <aside className="history-drawer" aria-label="Request history">
      <header className="history-header">
        <div className="history-title">
          <History size={15} />
          <strong>History</strong>
          <span>{entries.length}/{HISTORY_LIMIT}</span>
        </div>
        <button type="button" className="btn-icon" aria-label="Close history" title="Close" onClick={onClose}>
          <X size={15} />
        </button>
      </header>

      <div className="history-toolbar">
        <label className="history-filter">
          <input type="checkbox" checked={onlyThis} onChange={(e) => setOnlyThis(e.target.checked)} />
          This sampler only
        </label>
        <button
          type="button"
          className="text-button"
          disabled={entries.length === 0}
          onClick={() => window.confirm(`Delete all ${entries.length} history entries? This cannot be undone.`) && void clear()}
        >
          <Trash2 size={13} /> Clear all
        </button>
      </div>

      {error ? <div className="history-error" role="alert">{error}</div> : null}

      <ul className="history-list">
        {!loading && visible.length === 0 ? (
          <li className="history-empty">No requests yet. Use “Send Request” and they will appear here.</li>
        ) : null}
        {visible.map((entry) => (
          <li key={entry.id} className={`history-item ${entry.nodeId === nodeId ? 'is-current' : ''}`}>
            <button type="button" className="history-item-main" aria-expanded={expandedId === entry.id} onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
              <span className="history-item-row">
                <span className="history-method">{entry.method}</span>
                <span className={`history-status tone-${statusTone(entry.status)}`}>{entry.status || 'ERR'}</span>
                <span className="history-meta">{entry.latencyMs} ms · {formatRelativeTime(entry.timestamp)}</span>
              </span>
              <span className="history-url" title={entry.url}>{entry.url}</span>
              <span className="history-node">{entry.nodeName}</span>
            </button>
            {expandedId === entry.id ? (
              <div className="history-detail">
                {entry.headers.length > 0 ? (
                  <dl>
                    {entry.headers.map((h, i) => (
                      <div key={`${h.name}-${i}`}><dt>{h.name}</dt><dd>{h.value}</dd></div>
                    ))}
                  </dl>
                ) : <p className="history-muted">No headers</p>}
                {entry.body ? <pre>{entry.body.length > 2000 ? `${entry.body.slice(0, 2000)}…` : entry.body}</pre> : null}
                <div className="history-detail-actions">
                  <button type="button" className="btn btn-primary btn-sm" title="Variables were resolved when sent; restored values are literal." onClick={() => restore(entry)}>
                    <RotateCcw size={13} /> Restore into sampler
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => void remove(entry.id)}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </aside>
  )
}
