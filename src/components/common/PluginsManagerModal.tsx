import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Boxes,
  X,
  Search,
  CheckCircle2,
  Download,
  Trash2,
  ArrowUpCircle,
  ExternalLink,
  RefreshCw,
  Folder,
  Layers,
  AlertCircle,
  HardDrive,
  Info,
} from 'lucide-react'
import {
  jmeterPluginService,
  type PluginsManagerState,
  type InstalledPlugin,
  type JMeterPluginMeta,
} from '../../services/jmeterPluginService'

interface PluginsManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'installed' | 'available' | 'upgrades'

const CATEGORIES = [
  'All',
  'Thread Groups',
  'Samplers',
  'Timers',
  'Listeners',
  'Functions',
  'Protocols',
  'Core',
] as const

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function PluginsManagerModal({ isOpen, onClose }: PluginsManagerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('installed')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [pluginsState, setPluginsState] = useState<PluginsManagerState | null>(null)
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null)

  const loadState = useCallback(async () => {
    setIsLoading(true)
    try {
      const state = await jmeterPluginService.getPluginsState()
      setPluginsState(state)
      if (state.installed.length > 0 && !selectedPluginId) {
        setSelectedPluginId(state.installed[0].id)
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to scan JMeter plugins.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedPluginId])

  useEffect(() => {
    if (isOpen) {
      loadState()
    }
  }, [isOpen, loadState])

  // Filtered lists
  const filteredInstalled = useMemo(() => {
    if (!pluginsState) return []
    return pluginsState.installed.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory
      return matchSearch && matchCategory
    })
  }, [pluginsState, searchQuery, selectedCategory])

  const filteredAvailable = useMemo(() => {
    if (!pluginsState) return []
    return pluginsState.available.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory
      return matchSearch && matchCategory
    })
  }, [pluginsState, searchQuery, selectedCategory])

  const filteredUpgrades = useMemo(() => {
    if (!pluginsState) return []
    return pluginsState.upgrades.filter((p) => {
      return (
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [pluginsState, searchQuery])

  // Selected item lookup
  const selectedPlugin: (JMeterPluginMeta & { installedVersion?: string; jarPath?: string; jarSize?: number; isInstalled?: boolean }) | null = useMemo(() => {
    if (!selectedPluginId || !pluginsState) return null

    if (activeTab === 'installed') {
      return pluginsState.installed.find((p) => p.id === selectedPluginId) || null
    }
    if (activeTab === 'available') {
      return pluginsState.available.find((p) => p.id === selectedPluginId) || null
    }
    if (activeTab === 'upgrades') {
      const up = pluginsState.upgrades.find((p) => p.id === selectedPluginId)
      if (!up) return null
      return {
        ...up,
        version: up.latestVersion,
        installedVersion: up.currentVersion,
        category: 'Other',
        vendor: 'JMeter-Plugins.org',
        helpUrl: 'https://jmeter-plugins.org/',
      }
    }
    return null
  }, [selectedPluginId, pluginsState, activeTab])

  const handleInstall = async (pluginId: string) => {
    setIsProcessing(true)
    setStatusMessage({ type: 'info', text: `Downloading and installing plugin "${pluginId}"...` })
    try {
      const res = await jmeterPluginService.installPlugin(pluginId)
      setStatusMessage({ type: 'success', text: res.message })
      await loadState()
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Installation failed.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUninstall = async (plugin: InstalledPlugin) => {
    if (!window.confirm(`Are you sure you want to uninstall "${plugin.name}" (${plugin.id})?`)) return
    setIsProcessing(true)
    setStatusMessage({ type: 'info', text: `Removing plugin "${plugin.name}"...` })
    try {
      const res = await jmeterPluginService.uninstallPlugin(plugin.id, plugin.jarPath)
      setStatusMessage({ type: 'success', text: res.message })
      await loadState()
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to uninstall plugin.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content plugins-manager-modal"
        style={{ width: '920px', maxWidth: '95vw', height: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '6px', borderRadius: '6px', display: 'flex' }}>
              <Boxes size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>JMeter Plugins Manager</h3>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Scan, install, and manage official & custom Apache JMeter extension plugins
              </span>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* JMeter Location Banner */}
        <div style={{ background: '#f8fafc', padding: '6px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Folder size={14} style={{ flexShrink: 0 }} />
            <span>JMeter Directory:</span>
            <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: '3px', color: '#0f172a', fontWeight: 600 }}>
              {pluginsState?.jmeterHome || 'Not detected (running in mock mode)'}
            </code>
          </div>
          <button
            type="button"
            className="tool-text-button"
            onClick={loadState}
            disabled={isLoading || isProcessing}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px' }}
          >
            <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs Bar & Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', borderBottom: '1px solid var(--border)', background: '#fff', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'installed' ? 'active' : ''}`}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                fontSize: '12.5px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'installed' ? '#0284c7' : 'var(--border)',
                background: activeTab === 'installed' ? '#f0f9ff' : '#ffffff',
                color: activeTab === 'installed' ? '#0284c7' : 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                setActiveTab('installed')
                if (pluginsState?.installed.length) setSelectedPluginId(pluginsState.installed[0].id)
              }}
            >
              <CheckCircle2 size={14} />
              Installed Plugins
              <span style={{ background: activeTab === 'installed' ? '#bae6fd' : '#e2e8f0', color: '#0f172a', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>
                {pluginsState?.totalInstalled ?? 0}
              </span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                fontSize: '12.5px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'available' ? '#0284c7' : 'var(--border)',
                background: activeTab === 'available' ? '#f0f9ff' : '#ffffff',
                color: activeTab === 'available' ? '#0284c7' : 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                setActiveTab('available')
                if (pluginsState?.available.length) setSelectedPluginId(pluginsState.available[0].id)
              }}
            >
              <Download size={14} />
              Available Plugins
              <span style={{ background: activeTab === 'available' ? '#bae6fd' : '#e2e8f0', color: '#0f172a', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>
                {pluginsState?.totalAvailable ?? 0}
              </span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'upgrades' ? 'active' : ''}`}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                fontSize: '12.5px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'upgrades' ? '#0284c7' : 'var(--border)',
                background: activeTab === 'upgrades' ? '#f0f9ff' : '#ffffff',
                color: activeTab === 'upgrades' ? '#0284c7' : 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                setActiveTab('upgrades')
                if (pluginsState?.upgrades.length) setSelectedPluginId(pluginsState.upgrades[0].id)
              }}
            >
              <ArrowUpCircle size={14} />
              Upgrades
              <span style={{ background: activeTab === 'upgrades' ? '#bae6fd' : '#e2e8f0', color: '#0f172a', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>
                {pluginsState?.totalUpgrades ?? 0}
              </span>
            </button>
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

        {/* Category Pills Bar (for Installed / Available) */}
        {activeTab !== 'upgrades' ? (
          <div style={{ display: 'flex', gap: '6px', padding: '6px 18px', background: '#fafafa', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                style={{
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: selectedCategory === cat ? 600 : 500,
                  background: selectedCategory === cat ? '#0f172a' : '#e2e8f0',
                  color: selectedCategory === cat ? '#ffffff' : '#334155',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : null}

        {/* Status Message Banner */}
        {statusMessage ? (
          <div
            style={{
              padding: '6px 18px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: statusMessage.type === 'error' ? '#fef2f2' : statusMessage.type === 'success' ? '#f0fdf4' : '#eff6ff',
              color: statusMessage.type === 'error' ? '#991b1b' : statusMessage.type === 'success' ? '#166534' : '#1e40af',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {statusMessage.type === 'error' ? <AlertCircle size={14} /> : statusMessage.type === 'success' ? <CheckCircle2 size={14} /> : <Info size={14} />}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              onClick={() => setStatusMessage(null)}
            >
              <X size={13} />
            </button>
          </div>
        ) : null}

        {/* Split View Content Area */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left Column: Plugin List */}
          <div style={{ width: '360px', borderRight: '1px solid var(--border)', overflowY: 'auto', background: '#ffffff' }}>
            {activeTab === 'installed' ? (
              filteredInstalled.length > 0 ? (
                filteredInstalled.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPluginId(p.id)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: selectedPluginId === p.id ? '#f0f9ff' : 'transparent',
                      borderLeft: selectedPluginId === p.id ? '3px solid #0284c7' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#0f172a' }}>{p.name}</span>
                      <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        v{p.installedVersion}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.id} • {p.category}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                  No installed plugins match your filter.
                </div>
              )
            ) : null}

            {activeTab === 'available' ? (
              filteredAvailable.length > 0 ? (
                filteredAvailable.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPluginId(p.id)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: selectedPluginId === p.id ? '#f0f9ff' : 'transparent',
                      borderLeft: selectedPluginId === p.id ? '3px solid #0284c7' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#0f172a' }}>{p.name}</span>
                      {p.isInstalled ? (
                        <span style={{ fontSize: '10.5px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          Installed
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          v{p.version}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.id} • {p.category}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                  No available plugins found for search.
                </div>
              )
            ) : null}

            {activeTab === 'upgrades' ? (
              filteredUpgrades.length > 0 ? (
                filteredUpgrades.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPluginId(p.id)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: selectedPluginId === p.id ? '#f0f9ff' : 'transparent',
                      borderLeft: selectedPluginId === p.id ? '3px solid #0284c7' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#0f172a' }}>{p.name}</span>
                      <span style={{ fontSize: '11px', background: '#fef08a', color: '#854d0e', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {p.currentVersion} → {p.latestVersion}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{p.id}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                  <CheckCircle2 size={24} style={{ color: '#16a34a', margin: '0 auto 8px' }} />
                  <div>All installed plugins are up to date!</div>
                </div>
              )
            ) : null}
          </div>

          {/* Right Column: Plugin Details & Action Panel */}
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
                <div style={{ background: '#ffffff', padding: '14px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                    Package Details
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '4px', color: '#64748b' }}>
                    <span>Target Directory:</span>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                      {selectedPlugin.targetDir || 'lib/ext'} (JMeter Extension)
                    </span>

                    <span>Version:</span>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                      {selectedPlugin.installedVersion ? `v${selectedPlugin.installedVersion}` : `v${selectedPlugin.version}`}
                    </span>

                    {selectedPlugin.jarSize ? (
                      <>
                        <span>File Size:</span>
                        <span style={{ color: '#0f172a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <HardDrive size={12} />
                          {formatBytes(selectedPlugin.jarSize)}
                        </span>
                      </>
                    ) : null}

                    {selectedPlugin.jarPath ? (
                      <>
                        <span>File Location:</span>
                        <span style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
                          {selectedPlugin.jarPath}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

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
