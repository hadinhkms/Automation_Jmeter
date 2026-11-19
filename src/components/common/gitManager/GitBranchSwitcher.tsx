import { GitBranch } from 'lucide-react'
import type { GitActions } from './useGitActions'

interface GitBranchSwitcherProps {
  branches: string[]
  currentBranch?: string
  actions: GitActions
}

export function GitBranchSwitcher({ branches, currentBranch, actions }: GitBranchSwitcherProps) {
  const { showBranchDropdown, setShowBranchDropdown, branchLoading, newBranchName, setNewBranchName, handleCheckout } = actions
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn-secondary"
        onClick={() => setShowBranchDropdown(!showBranchDropdown)}
        style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
        disabled={branchLoading}
      >
        <GitBranch size={12} />
        {branchLoading ? 'Switching...' : 'Switch Branch'}
      </button>
      {showBranchDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: 'var(--bg-primary, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 10000,
            minWidth: 220,
            maxHeight: 300,
            overflow: 'auto',
            padding: 6,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '4px 8px', fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branches</div>
          {branches.map((b) => (
            <button
              key={b}
              onClick={() => handleCheckout(b)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                fontSize: 12,
                background: b === currentBranch ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                color: b === currentBranch ? '#60a5fa' : 'var(--text-color, #e2e8f0)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: b === currentBranch ? 600 : 400,
              }}
            >
              {b === currentBranch ? `● ${b}` : b}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border-color, #334155)', margin: '6px 0', paddingTop: 6 }}>
            <div style={{ display: 'flex', gap: 4, padding: '0 4px' }}>
              <input
                type="text"
                placeholder="New branch name..."
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newBranchName.trim()) handleCheckout(newBranchName.trim(), true) }}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: 11,
                  background: 'var(--bg-secondary, #0f172a)',
                  border: '1px solid var(--border-color, #475569)',
                  borderRadius: 4,
                  color: 'var(--text-color, #e2e8f0)',
                  outline: 'none',
                }}
              />
              <button
                className="btn-primary"
                style={{ fontSize: 10, padding: '3px 8px' }}
                disabled={!newBranchName.trim()}
                onClick={() => handleCheckout(newBranchName.trim(), true)}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
