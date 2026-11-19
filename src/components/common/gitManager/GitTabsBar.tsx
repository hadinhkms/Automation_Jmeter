import type { GitTab } from '../../../models/gitManager'

interface GitTabsBarProps {
  activeTab: GitTab
  setActiveTab: (tab: GitTab) => void
  fileCount: number
}

export function GitTabsBar({ activeTab, setActiveTab, fileCount }: GitTabsBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '6px 24px',
        borderBottom: '1px solid var(--border-color, #334155)',
        background: 'var(--bg-secondary, rgba(15, 23, 42, 0.4))',
      }}
    >
      <button
        onClick={() => setActiveTab('working-tree')}
        style={{
          padding: '6px 12px',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          borderBottom: activeTab === 'working-tree' ? '2px solid #3b82f6' : '2px solid transparent',
          color: activeTab === 'working-tree' ? '#60a5fa' : 'var(--text-muted, #94a3b8)',
        }}
      >
        Working Tree Changes ({fileCount})
      </button>
      <button
        onClick={() => setActiveTab('jmx-diff')}
        style={{
          padding: '6px 12px',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          borderBottom: activeTab === 'jmx-diff' ? '2px solid #3b82f6' : '2px solid transparent',
          color: activeTab === 'jmx-diff' ? '#60a5fa' : 'var(--text-muted, #94a3b8)',
        }}
      >
        JMX Semantic Diff
      </button>
    </div>
  )
}
