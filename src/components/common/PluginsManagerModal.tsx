import { usePluginsManager } from './pluginsManager/usePluginsManager'
import { usePluginFilters } from './pluginsManager/usePluginFilters'
import { PluginsHeader } from './pluginsManager/PluginsHeader'
import { PluginsToolbar } from './pluginsManager/PluginsToolbar'
import { PluginCategoryPills } from './pluginsManager/PluginCategoryPills'
import { PluginStatusBanner } from './pluginsManager/PluginStatusBanner'
import { PluginList } from './pluginsManager/PluginList'
import { PluginDetails } from './pluginsManager/PluginDetails'

interface PluginsManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PluginsManagerModal({ isOpen, onClose }: PluginsManagerModalProps) {
  const pm = usePluginsManager(isOpen)
  const { activeTab, selectedCategory, setSelectedCategory, searchQuery, pluginsState, selectedPluginId, setSelectedPluginId } = pm
  const { isLoading, isProcessing, statusMessage, setStatusMessage, loadState, handleInstall, handleUninstall } = pm
  const { filteredInstalled, filteredAvailable, filteredUpgrades, selectedPlugin } = usePluginFilters(
    pluginsState,
    searchQuery,
    selectedCategory,
    selectedPluginId,
    activeTab,
  )

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content plugins-manager-modal"
        style={{ width: '920px', maxWidth: '95vw', height: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <PluginsHeader
          jmeterHome={pluginsState?.jmeterHome}
          loadState={loadState}
          isLoading={isLoading}
          isProcessing={isProcessing}
          onClose={onClose}
        />

        {/* Tabs Bar & Search */}
        <PluginsToolbar pm={pm} />

        {/* Category Pills Bar (for Installed / Available) */}
        {activeTab !== 'upgrades' ? (
          <PluginCategoryPills selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
        ) : null}

        {/* Status Message Banner */}
        {statusMessage ? (
          <PluginStatusBanner statusMessage={statusMessage} onDismiss={() => setStatusMessage(null)} />
        ) : null}

        {/* Split View Content Area */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left Column: Plugin List */}
          <PluginList
            activeTab={activeTab}
            filteredInstalled={filteredInstalled}
            filteredAvailable={filteredAvailable}
            filteredUpgrades={filteredUpgrades}
            selectedPluginId={selectedPluginId}
            setSelectedPluginId={setSelectedPluginId}
          />

          {/* Right Column: Plugin Details & Action Panel */}
          <PluginDetails
            activeTab={activeTab}
            selectedPlugin={selectedPlugin}
            isProcessing={isProcessing}
            handleInstall={handleInstall}
            handleUninstall={handleUninstall}
          />
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            Tip: Changes take effect immediately in the active JMeter environment.
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '5px 16px', fontSize: '12px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
