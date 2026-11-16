import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { jmeterRunner } from './jmeterRunner'
import { PLUGIN_CATALOG, type AvailablePlugin, type InstalledPlugin, type PluginUpgrade } from './plugins/pluginCatalog'
import { downloadFile, scanInstalledJars } from './plugins/pluginJars'

export { PLUGIN_CATALOG }
export type { JMeterPluginMeta, InstalledPlugin, AvailablePlugin, PluginUpgrade } from './plugins/pluginCatalog'

export class JMeterPluginsManager {
  private async getJMeterHome(): Promise<string | null> {
    const detection = await jmeterRunner.detectJMeter()
    if (!detection.found || !detection.path) return null
    const binDir = dirname(detection.path)
    return dirname(binDir)
  }

  public async getPluginsState() {
    const jmeterHome = await this.getJMeterHome()
    const installedJars = scanInstalledJars(jmeterHome)

    const installed: InstalledPlugin[] = []
    const available: AvailablePlugin[] = []
    const upgrades: PluginUpgrade[] = []

    const matchedCatalogIds = new Set<string>()

    for (const jar of installedJars) {
      const catalogMatch = PLUGIN_CATALOG.find(
        (c) =>
          jar.name.toLowerCase().includes(c.id.toLowerCase()) ||
          (c.jarName && jar.name.toLowerCase().includes(c.jarName.replace('.jar', '').toLowerCase())),
      )

      if (catalogMatch) {
        matchedCatalogIds.add(catalogMatch.id)
        const versionMatch = jar.name.match(/[\d.]+(?=\.jar)/)
        const installedVer = versionMatch ? versionMatch[0] : catalogMatch.version

        installed.push({
          ...catalogMatch,
          installedVersion: installedVer,
          jarPath: jar.path,
          jarSize: jar.size,
          isManaged: true,
        })

        if (catalogMatch.version !== installedVer && catalogMatch.downloadUrl) {
          upgrades.push({
            id: catalogMatch.id,
            name: catalogMatch.name,
            currentVersion: installedVer,
            latestVersion: catalogMatch.version,
            description: catalogMatch.description,
            downloadUrl: catalogMatch.downloadUrl,
          })
        }
      } else {
        const versionMatch = jar.name.match(/[\d.]+(?=\.jar)/)
        installed.push({
          id: jar.name.replace(/\.jar$/i, ''),
          name: jar.name.replace(/\.jar$/i, '').replace(/[-_]/g, ' '),
          version: versionMatch ? versionMatch[0] : '1.0.0',
          installedVersion: versionMatch ? versionMatch[0] : '1.0.0',
          description: `Custom installed library / plugin in ${jar.isExt ? 'lib/ext' : 'lib'}`,
          category: jar.isExt ? 'Other' : 'Core',
          vendor: 'Local / Third-party',
          helpUrl: 'https://jmeter-plugins.org/',
          jarPath: jar.path,
          jarSize: jar.size,
          isManaged: false,
        })
      }
    }

    for (const cat of PLUGIN_CATALOG) {
      const isInst = matchedCatalogIds.has(cat.id)
      available.push({
        ...cat,
        availableVersions: [cat.version],
        isInstalled: isInst,
      })
    }

    return {
      jmeterHome,
      installed,
      available,
      upgrades,
      totalInstalled: installed.length,
      totalAvailable: available.length,
      totalUpgrades: upgrades.length,
    }
  }

  public async installPlugin(pluginId: string): Promise<{ success: boolean; message: string; jarPath?: string }> {
    const jmeterHome = await this.getJMeterHome()
    if (!jmeterHome || !existsSync(jmeterHome)) {
      throw new Error('JMeter installation directory not found. Please configure JMeter path in Settings first.')
    }

    const plugin = PLUGIN_CATALOG.find((p) => p.id === pluginId)
    if (!plugin || !plugin.downloadUrl || !plugin.jarName) {
      throw new Error(`Plugin '${pluginId}' not found in catalog or has no download URL.`)
    }

    const targetSubDir = plugin.targetDir || 'lib/ext'
    const targetDir = join(jmeterHome, targetSubDir)
    mkdirSync(targetDir, { recursive: true })

    const destPath = join(targetDir, plugin.jarName)

    await downloadFile(plugin.downloadUrl, destPath)

    return {
      success: true,
      message: `Successfully installed "${plugin.name}" (${plugin.jarName}) into ${targetSubDir}.`,
      jarPath: destPath,
    }
  }

  public async uninstallPlugin(pluginId: string, jarPath?: string): Promise<{ success: boolean; message: string }> {
    const jmeterHome = await this.getJMeterHome()
    if (!jmeterHome || !existsSync(jmeterHome)) {
      throw new Error('JMeter installation directory not found.')
    }

    let targetFile = jarPath

    if (!targetFile) {
      const plugin = PLUGIN_CATALOG.find((p) => p.id === pluginId)
      if (plugin?.jarName) {
        const p1 = join(jmeterHome, 'lib', 'ext', plugin.jarName)
        const p2 = join(jmeterHome, 'lib', plugin.jarName)
        if (existsSync(p1)) targetFile = p1
        else if (existsSync(p2)) targetFile = p2
      }
    }

    if (!targetFile || !existsSync(targetFile)) {
      throw new Error(`JAR file for plugin "${pluginId}" not found on disk.`)
    }

    unlinkSync(targetFile)
    return {
      success: true,
      message: `Successfully removed ${basename(targetFile)}.`,
    }
  }
}

export const jmeterPluginsManager = new JMeterPluginsManager()
