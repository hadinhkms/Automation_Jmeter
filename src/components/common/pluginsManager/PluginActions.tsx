import { ArrowUpCircle, CheckCircle2, Download, Trash2 } from 'lucide-react'
import type { InstalledPlugin } from '../../../services/jmeterPluginService'
import type { SelectedPlugin, TabType } from './constants'

interface PluginActionsProps {
  activeTab: TabType
  selectedPlugin: SelectedPlugin
  isProcessing: boolean
  handleInstall: (pluginId: string) => void
  handleUninstall: (plugin: InstalledPlugin) => void
}

export function PluginActions({ activeTab, selectedPlugin, isProcessing, handleInstall, handleUninstall }: PluginActionsProps) {
  return (
    <div>
      {activeTab === 'available' ? (
        selectedPlugin.isInstalled ? (
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
            Installed
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={isProcessing}
            onClick={() => handleInstall(selectedPlugin.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#0284c7' }}
          >
            <Download size={14} />
            Install Plugin
          </button>
        )
      ) : null}

      {activeTab === 'installed' ? (
        <button
          type="button"
          className="btn-danger btn-sm"
          disabled={isProcessing}
          // SAFETY: this button renders only on the Installed tab, where the selection is an InstalledPlugin
          onClick={() => handleUninstall(selectedPlugin as InstalledPlugin)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#dc2626' }}
        >
          <Trash2 size={14} />
          Uninstall
        </button>
      ) : null}

      {activeTab === 'upgrades' ? (
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={isProcessing}
          onClick={() => handleInstall(selectedPlugin.id)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#16a34a' }}
        >
          <ArrowUpCircle size={14} />
          Upgrade Now
        </button>
      ) : null}
    </div>
  )
}
