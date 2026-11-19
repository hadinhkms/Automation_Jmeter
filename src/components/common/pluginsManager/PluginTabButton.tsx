import type { LucideIcon } from 'lucide-react'
import type { TabType } from './constants'

interface PluginTabButtonProps {
  tab: TabType
  activeTab: TabType
  icon: LucideIcon
  label: string
  count: number
  onClick: () => void
}

export function PluginTabButton({ tab, activeTab, icon: Icon, label, count, onClick }: PluginTabButtonProps) {
  const isActive = activeTab === tab
  return (
    <button
      type="button"
      className={`tab-btn ${isActive ? 'active' : ''}`}
      style={{
        padding: '6px 14px',
        borderRadius: '4px',
        fontSize: '12.5px',
        fontWeight: 600,
        border: '1px solid',
        borderColor: isActive ? '#0284c7' : 'var(--border)',
        background: isActive ? '#f0f9ff' : '#ffffff',
        color: isActive ? '#0284c7' : 'var(--text)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
      onClick={onClick}
    >
      <Icon size={14} />
      {label}
      <span style={{ background: isActive ? '#bae6fd' : '#e2e8f0', color: '#0f172a', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>
        {count}
      </span>
    </button>
  )
}
