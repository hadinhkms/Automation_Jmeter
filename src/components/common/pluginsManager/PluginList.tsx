import { CheckCircle2 } from 'lucide-react'
import type { AvailablePlugin, InstalledPlugin, PluginUpgrade } from '../../../services/jmeterPluginService'
import type { TabType } from './constants'
import { PluginListEmpty, PluginListRow } from './PluginListRow'

interface PluginListProps {
  activeTab: TabType
  filteredInstalled: InstalledPlugin[]
  filteredAvailable: AvailablePlugin[]
  filteredUpgrades: PluginUpgrade[]
  selectedPluginId: string | null
  setSelectedPluginId: (id: string) => void
}

export function PluginList(props: PluginListProps) {
  const { activeTab, filteredInstalled, filteredAvailable, filteredUpgrades, selectedPluginId, setSelectedPluginId } = props
  const rowProps = (id: string) => ({ selected: selectedPluginId === id, onSelect: () => setSelectedPluginId(id) })

  return (
    <div style={{ width: '360px', borderRight: '1px solid var(--border)', overflowY: 'auto', background: '#ffffff' }}>
      {activeTab === 'installed' ? (
        filteredInstalled.length > 0 ? (
          filteredInstalled.map((p) => (
            <PluginListRow key={p.id} {...rowProps(p.id)} name={p.name} badge={`v${p.installedVersion}`} badgeTone="version" subtitle={`${p.id} • ${p.category}`} />
          ))
        ) : (
          <PluginListEmpty>No installed plugins match your filter.</PluginListEmpty>
        )
      ) : null}

      {activeTab === 'available' ? (
        filteredAvailable.length > 0 ? (
          filteredAvailable.map((p) => (
            <PluginListRow
              key={p.id}
              {...rowProps(p.id)}
              name={p.name}
              badge={p.isInstalled ? 'Installed' : `v${p.version}`}
              badgeTone={p.isInstalled ? 'installed' : 'neutral'}
              subtitle={`${p.id} • ${p.category}`}
            />
          ))
        ) : (
          <PluginListEmpty>No available plugins found for search.</PluginListEmpty>
        )
      ) : null}

      {activeTab === 'upgrades' ? (
        filteredUpgrades.length > 0 ? (
          filteredUpgrades.map((p) => (
            <PluginListRow key={p.id} {...rowProps(p.id)} name={p.name} badge={`${p.currentVersion} → ${p.latestVersion}`} badgeTone="upgrade" subtitle={p.id} clipSubtitle={false} />
          ))
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
            <CheckCircle2 size={24} style={{ color: '#16a34a', margin: '0 auto 8px' }} />
            <div>All installed plugins are up to date!</div>
          </div>
        )
      ) : null}
    </div>
  )
}
