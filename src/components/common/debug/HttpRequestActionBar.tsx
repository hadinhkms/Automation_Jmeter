import { useState } from 'react'
import { History } from 'lucide-react'
import type { TestPlanNode } from '../../../models/jmeter'
import type { HistoryEntry } from '../../../services/historyStorageService'
import { historyEntryToProperties } from '../../../utils/debug/historyRestore'
import { RequestHistoryDrawer } from './RequestHistoryDrawer'
import { SendRequestButton } from './SendRequestButton'
import './requestHistory.css'

interface HttpRequestActionBarProps {
  node: TestPlanNode
  isSending: boolean
  canSend: boolean
  onSend: () => void
  updateProperties: (updates: Record<string, unknown>) => void
}

/** Title row of the HTTP Request editor: History drawer toggle + Send Request. */
export function HttpRequestActionBar({ node, isSending, canSend, onSend, updateProperties }: HttpRequestActionBarProps) {
  const [historyOpen, setHistoryOpen] = useState(false)

  const restore = (entry: HistoryEntry) => {
    const updates = historyEntryToProperties(entry)
    if (updates) updateProperties(updates)
  }

  return (
    <div className="http-action-bar">
      <span className="http-action-bar-title">HTTP Request Sampler</span>
      <div className="http-action-bar-buttons">
        <button
          type="button"
          className="text-button"
          aria-pressed={historyOpen}
          title="Recent Send Request calls (last 50)"
          onClick={() => setHistoryOpen((open) => !open)}
        >
          <History size={13} /> History
        </button>
        <SendRequestButton isSending={isSending} onSend={onSend} disabled={!canSend} />
      </div>
      {historyOpen ? (
        <RequestHistoryDrawer nodeId={node.id} nodeName={node.name} onRestore={restore} onClose={() => setHistoryOpen(false)} />
      ) : null}
    </div>
  )
}
