import { ArrowUpCircle, CheckCircle2, Download, Search } from 'lucide-react'
import type { PluginsManager } from './usePluginsManager'
import { PluginTabButton } from './PluginTabButton'

interface PluginsToolbarProps {
  pm: PluginsManager
}

export function PluginsToolbar({ pm }: PluginsToolbarProps) {
  const { activeTab, setActiveTab, pluginsState, setSelectedPluginId, searchQuery, setSearchQuery } = pm
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', borderBottom: '1px solid var(--border)', background: '#fff', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <PluginTabButton
          tab="installed"
          activeTab={activeTab}
          icon={CheckCircle2}
          label="Installed Plugins"
          count={pluginsState?.totalInstalled ?? 0}
          onClick={() => {
            setActiveTab('installed')
            if (pluginsState?.installed.length) setSelectedPluginId(pluginsState.installed[0].id)
          }}
        />

        <PluginTabButton
          tab="available"
          activeTab={activeTab}
          icon={Download}
          label="Available Plugins"
          count={pluginsState?.totalAvailable ?? 0}
          onClick={() => {
            setActiveTab('available')
            if (pluginsState?.available.length) setSelectedPluginId(pluginsState.available[0].id)
          }}
        />

        <PluginTabButton
          tab="upgrades"
          activeTab={activeTab}
          icon={ArrowUpCircle}
          label="Upgrades"
          count={pluginsState?.totalUpgrades ?? 0}
          onClick={() => {
            setActiveTab('upgrades')
            if (pluginsState?.upgrades.length) setSelectedPluginId(pluginsState.upgrades[0].id)
          }}
        />
      </div>

      {/* Search Box */}
      <div style={{ position: 'relative', width: '240px' }}>
        <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          placeholder="Search plugins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '5px 8px 5px 28px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
        />
      </div>
    </div>
  )
}
