import { GitBranch, RefreshCw, X } from 'lucide-react'
import type { GitRepo } from './useGitRepo'
import type { GitActions } from './useGitActions'
import { GitBranchSwitcher } from './GitBranchSwitcher'

interface GitManagerHeaderProps {
  repo: GitRepo
  actions: GitActions
  onClose: () => void
}

export function GitManagerHeader({ repo, actions, onClose }: GitManagerHeaderProps) {
  const { status, loading, loadStatus, branches } = repo
  return (
    <div className="modal-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <GitBranch size={20} color="#2563eb" />
        <h3>Git Version Control & JMX Visual Diff Viewer</h3>
        {status?.branch && (
          <span
            style={{
              fontSize: 12,
              background: '#dbeafe',
              color: '#1d4ed8',
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            {status.branch}
          </span>
        )}
        <GitBranchSwitcher branches={branches} currentBranch={status?.branch} actions={actions} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn-icon" onClick={loadStatus} title="Refresh Git Status">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
        <button className="btn-icon" onClick={onClose} title="Close">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
