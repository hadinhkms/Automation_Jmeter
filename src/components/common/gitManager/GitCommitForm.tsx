import { GitCommit, Send } from 'lucide-react'
import type { GitActions } from './useGitActions'

interface GitCommitFormProps {
  actions: GitActions
  loading: boolean
  actionMessage: string | null
  error: string | null
}

export function GitCommitForm({ actions, loading, actionMessage, error }: GitCommitFormProps) {
  const { commitMessage, setCommitMessage, handleCommit } = actions
  return (
    <div style={{ marginTop: 12, flexShrink: 0 }}>
      <textarea
        rows={2}
        placeholder="Commit message (e.g. Update load test concurrency & add token extractor)..."
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        style={{
          width: '100%',
          resize: 'none',
          fontSize: 12,
          padding: '8px 10px',
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="btn btn-secondary"
          onClick={() => handleCommit(false)}
          disabled={loading || !commitMessage.trim()}
          style={{
            flex: 1,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <GitCommit size={14} /> Commit
        </button>
        <button
          className="btn btn-primary"
          onClick={() => handleCommit(true)}
          disabled={loading || !commitMessage.trim()}
          style={{
            flex: 1,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <Send size={14} /> Commit & Push
        </button>
      </div>

      {actionMessage && (
        <div style={{ fontSize: 12, marginTop: 6, color: '#059669', fontWeight: 500 }}>
          {actionMessage}
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12, marginTop: 6, color: '#dc2626', fontWeight: 500 }}>
          {error}
        </div>
      )}
    </div>
  )
}
