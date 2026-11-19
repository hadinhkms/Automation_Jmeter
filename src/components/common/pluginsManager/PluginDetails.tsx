import { Boxes, ExternalLink, Layers } from 'lucide-react'
import type { InstalledPlugin } from '../../../services/jmeterPluginService'
import type { SelectedPlugin, TabType } from './constants'
import { PluginActions } from './PluginActions'
import { PluginPackageDetails } from './PluginPackageDetails'

interface PluginDetailsProps {
  activeTab: TabType
  selectedPlugin: SelectedPlugin | null
  isProcessing: boolean
  handleInstall: (pluginId: string) => void
  handleUninstall: (plugin: InstalledPlugin) => void
}

export function PluginDetails({ activeTab, selectedPlugin, isProcessing, handleInstall, handleUninstall }: PluginDetailsProps) {
  return (
    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f8fafc' }}>
      {selectedPlugin ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {selectedPlugin.name}
              </h4>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                  {selectedPlugin.id}
                </span>
                <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                  {selectedPlugin.category}
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  By {selectedPlugin.vendor}
                </span>
              </div>
            </div>

            {/* Actions */}
            <PluginActions
              activeTab={activeTab}
              selectedPlugin={selectedPlugin}
              isProcessing={isProcessing}
              handleInstall={handleInstall}
              handleUninstall={handleUninstall}
            />
          </div>

          {/* Description */}
          <div style={{ background: '#ffffff', padding: '14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Description
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              {selectedPlugin.description}
            </p>
          </div>

          {/* Technical / File Details */}
          <PluginPackageDetails selectedPlugin={selectedPlugin} />

          {/* Help / Docs Link */}
          {selectedPlugin.helpUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <Layers size={14} style={{ color: '#64748b' }} />
              <a
                href={selectedPlugin.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                Official Documentation & Wiki
                <ExternalLink size={12} />
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#94a3b8', textAlign: 'center' }}>
          <div>
            <Boxes size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <div style={{ fontSize: '13px', fontWeight: 500 }}>Select a plugin from the list to view details</div>
          </div>
        </div>
      )}
    </div>
  )
}
