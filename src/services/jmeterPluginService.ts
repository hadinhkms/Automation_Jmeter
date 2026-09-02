export interface JMeterPluginMeta {
  id: string
  name: string
  version: string
  description: string
  category: 'Thread Groups' | 'Samplers' | 'Timers' | 'Listeners' | 'Functions' | 'Protocols' | 'Core' | 'Other'
  vendor: string
  helpUrl: string
  downloadUrl?: string
  jarName?: string
  targetDir?: 'lib/ext' | 'lib'
}

export interface InstalledPlugin extends JMeterPluginMeta {
  installedVersion: string
  jarPath: string
  jarSize: number
  isManaged: boolean
}

export interface AvailablePlugin extends JMeterPluginMeta {
  availableVersions: string[]
  isInstalled: boolean
}

export interface PluginUpgrade {
  id: string
  name: string
  currentVersion: string
  latestVersion: string
  description: string
  downloadUrl: string
}

export interface PluginsManagerState {
  jmeterHome: string | null
  installed: InstalledPlugin[]
  available: AvailablePlugin[]
  upgrades: PluginUpgrade[]
  totalInstalled: number
  totalAvailable: number
  totalUpgrades: number
}

export const jmeterPluginService = {
  async getPluginsState(): Promise<PluginsManagerState> {
    const res = await fetch('/api/jmeter/plugins')
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch plugins state`)
    return await res.json()
  },

  async installPlugin(pluginId: string): Promise<{ success: boolean; message: string; jarPath?: string }> {
    const res = await fetch('/api/jmeter/plugins/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}: Failed to install plugin`)
    }
    return await res.json()
  },

  async uninstallPlugin(pluginId: string, jarPath?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/jmeter/plugins/uninstall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId, jarPath }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}: Failed to uninstall plugin`)
    }
    return await res.json()
  },
}
