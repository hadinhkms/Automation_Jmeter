import { useEffect, useRef, useState } from 'react'
import { Terminal, Trash2, X, ChevronDown, ChevronUp, ArrowDown } from 'lucide-react'
import { useJMeterStore } from '../../store/jmeterStore'

export function ConsoleLogDrawer() {
  const store = useJMeterStore()
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [store.liveLogs, autoScroll])

  if (!store.isConsoleOpen) return null

  return (
    <div className={`console-drawer ${minimized ? 'minimized' : ''}`}>
      <div className="console-header">
        <div className="console-title">
          <Terminal size={15} />
          <strong>JMeter Live Console</strong>
          <span className={`run-pill state-${store.runState.toLowerCase()}`}>
            {store.runState === 'RUNNING' ? 'Running CLI...' : store.runState}
          </span>
          <span className="log-count">({store.liveLogs.length} lines)</span>
        </div>

        <div className="console-actions">
          <button
            type="button"
            className={`console-btn ${autoScroll ? 'active' : ''}`}
            title="Auto-scroll to latest log"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            <ArrowDown size={13} />
            <span>Auto-scroll</span>
          </button>
          <button
            type="button"
            className="console-btn"
            title="Clear console logs"
            onClick={store.clearLogs}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
          <button
            type="button"
            className="console-btn"
            title={minimized ? 'Expand console' : 'Minimize console'}
            onClick={() => setMinimized(!minimized)}
          >
            {minimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            type="button"
            className="console-btn btn-close"
            title="Close console"
            onClick={() => store.setConsoleOpen(false)}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized ? (
        <div ref={logContainerRef} className="console-body">
          {store.liveLogs.length === 0 ? (
            <div className="console-empty">
              No console output yet. Click <strong>Start</strong> to begin executing your test plan.
            </div>
          ) : (
            <div className="log-list">
              {store.liveLogs.map((entry) => (
                <div key={entry.id} className={`log-line ${entry.type === 'stderr' ? 'log-err' : ''}`}>
                  <span className="log-time">[{entry.time}]</span>
                  <span className="log-content">{entry.line}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
