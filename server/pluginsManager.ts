// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { existsSync, readdirSync, statSync, unlinkSync, createWriteStream, mkdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { get as httpGet } from 'node:http'
import { get as httpsGet } from 'node:https'
import { jmeterRunner } from './jmeterRunner'

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

// Curated official & popular JMeter plugins catalog
export const PLUGIN_CATALOG: JMeterPluginMeta[] = [
  {
    id: 'jpgc-casutg',
    name: 'Custom Thread Groups',
    version: '2.10',
    description: 'Provides Concurrency Thread Group, Stepping Thread Group, Ultimate Thread Group, and Free-Form Arrivals Thread Group with visual ramp-up schedules.',
    category: 'Thread Groups',
    vendor: 'BlazeMeter / JMeter-Plugins.org',
    helpUrl: 'https://jmeter-plugins.org/wiki/ConcurrencyThreadGroup/',
    downloadUrl: 'https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-casutg/2.10/jmeter-plugins-casutg-2.10.jar',
    jarName: 'jmeter-plugins-casutg-2.10.jar',
    targetDir: 'lib/ext',
  },
  {
    id: 'jpgc-dummy',
    name: 'Dummy Sampler',
    version: '0.4',
    description: 'Emulates requests and responses with custom response codes, headers, latency, connect time, and response data without network overhead. Ideal for debugging and demoing test plans.',
    category: 'Samplers',
    vendor: 'JMeter-Plugins.org',
    helpUrl: 'https://jmeter-plugins.org/wiki/DummySampler/',
    downloadUrl: 'https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-dummy/0.4/jmeter-plugins-dummy-0.4.jar',
    jarName: 'jmeter-plugins-dummy-0.4.jar',
    targetDir: 'lib/ext',
  },
  {
    id: 'jpgc-tst',
    name: 'Throughput Shaping Timer',
    version: '2.5',
    description: 'Dynamic throughput shaping with RPS schedule table, feedback loop, and concurrency synchronization.',
    category: 'Timers',
    vendor: 'BlazeMeter / JMeter-Plugins.org',
    helpUrl: 'https://jmeter-plugins.org/wiki/ThroughputShapingTimer/',
    downloadUrl: 'https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-tst/2.5/jmeter-plugins-tst-2.5.jar',
    jarName: 'jmeter-plugins-tst-2.5.jar',
    targetDir: 'lib/ext',
  },
  {
    id: 'jpgc-ffw',
    name: 'Flexible File Writer',
    version: '2.0',
    description: 'Extremely fast custom CSV/text file writer plugin that can write custom sample fields, headers, and metrics.',
    category: 'Listeners',
    vendor: 'JMeter-Plugins.org',
    helpUrl: 'https://jmeter-plugins.org/wiki/FlexibleFileWriter/',
    downloadUrl: 'https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-ffw/2.0/jmeter-plugins-ffw-2.0.jar',
    jarName: 'jmeter-plugins-ffw-2.0.jar',
    targetDir: 'lib/ext',
  },
  {
    id: 'jpgc-graphs-basic',
    name: '3 Basic Graphs',
    version: '2.0',
    description: 'Active Threads Over Time, Response Times Over Time, and Hits per Second real-time listeners and graph generators.',
    category: 'Listeners',
    vendor: 'JMeter-Plugins.org',
    helpUrl: 'https://jmeter-plugins.org/wiki/ResponseTimesOverTime/',
    downloadUrl: 'https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-graphs-basic/2.0/jmeter-plugins-graphs-basic-2.0.jar',
    jarName: 'jmeter-plugins-graphs-basic-2.0.jar',
    targetDir: 'lib/ext',
  },
  {
    id: 'jpgc-autostop',
    name: 'AutoStop Listener',
    version: '0.1',
    description: 'Automatically stops test execution if error rate exceeds a threshold or response time spikes beyond expected SLA limits.',
    category: 'Listeners',
    vendor: 'JMeter-Plugins.org',
    helpUrl: 'https://jmeter-plugins.org/wiki/AutoStop/',
    downloadUrl: 'https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-autostop/0.1/jmeter-plugins-autostop-0.1.jar',
    jarName: 'jmeter-plugins-autostop-0.1.jar',
    targetDir: 'lib/ext',
  },
  {
    id: 'jpgc-functions',
    name: 'Custom JMeter Functions',
    version: '2.2',
    description: 'Additional custom functions for JMeter: __doubleSum, __MD5, __base64Encode, __substring, __env, and string utilities.',
    category: 'Functions',
    vendor: 'JMeter-Plugins.org',
    helpUrl: 'https://jmeter-plugins.org/wiki/Functions/',
    downloadUrl: 'https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-functions/2.2/jmeter-plugins-functions-2.2.jar',
    jarName: 'jmeter-plugins-functions-2.2.jar',
    targetDir: 'lib/ext',
  },
  {
    id: 'jmeter-plugins-manager',
    name: 'JMeter Plugins Manager Core',
    version: '1.10',
    description: 'Official JMeter Plugins Manager desktop GUI and command line installer component.',
    category: 'Core',
    vendor: 'JMeter-Plugins.org',
    helpUrl: 'https://jmeter-plugins.org/wiki/PluginsManager/',
    downloadUrl: 'https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.10/jmeter-plugins-manager-1.10.jar',
    jarName: 'jmeter-plugins-manager-1.10.jar',
    targetDir: 'lib/ext',
  },
  {
    id: 'jmeter-plugins-cmn-jmeter',
    name: 'Command-Line Graph Plotter (CMD)',
    version: '0.7',
    description: 'Common library and command line tool to generate PNG and CSV graphs from JTL results.',
    category: 'Core',
    vendor: 'JMeter-Plugins.org',
    helpUrl: 'https://jmeter-plugins.org/wiki/JMeterPluginsCMD/',
    downloadUrl: 'https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-cmn-jmeter/0.7/jmeter-plugins-cmn-jmeter-0.7.jar',
    jarName: 'jmeter-plugins-cmn-jmeter-0.7.jar',
    targetDir: 'lib',
  },
  {
    id: 'jmeter-websocket-samplers',
    name: 'WebSocket Samplers',
    version: '1.2.10',
    description: 'Full RFC 6455 compliant WebSocket sampler suite: Open Connection, Ping/Pong, Request/Response Text/Binary Samplers, Frame Filter.',
    category: 'Protocols',
    vendor: 'Peter Doornbosch',
    helpUrl: 'https://github.com/maciejzaleski/JMeter-WebSocketSampler',
    downloadUrl: 'https://repo1.maven.org/maven2/com/lazerycode/jmeter/jmeter-websocket-samplers/1.2.10/jmeter-websocket-samplers-1.2.10.jar',
    jarName: 'jmeter-websocket-samplers-1.2.10.jar',
    targetDir: 'lib/ext',
  },
]

export class JMeterPluginsManager {
  private getJMeterHome(): string | null {
    const detection = jmeterRunner.detectJMeter()
    if (!detection.found || !detection.path) return null
    const binDir = dirname(detection.path)
    return dirname(binDir)
  }

  public getPluginsState() {
    const jmeterHome = this.getJMeterHome()
    const installedJars = this.scanInstalledJars(jmeterHome)

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

  private scanInstalledJars(jmeterHome: string | null): Array<{ name: string; path: string; size: number; isExt: boolean }> {
    if (!jmeterHome || !existsSync(jmeterHome)) return []

    const jars: Array<{ name: string; path: string; size: number; isExt: boolean }> = []

    const extDir = join(jmeterHome, 'lib', 'ext')
    if (existsSync(extDir)) {
      try {
        const files = readdirSync(extDir)
        for (const file of files) {
          if (file.endsWith('.jar')) {
            const filePath = join(extDir, file)
            const st = statSync(filePath)
            jars.push({ name: file, path: filePath, size: st.size, isExt: true })
          }
        }
      } catch {
        // ignore
      }
    }

    const libDir = join(jmeterHome, 'lib')
    if (existsSync(libDir)) {
      try {
        const files = readdirSync(libDir)
        for (const file of files) {
          if (file.endsWith('.jar') && file.toLowerCase().includes('plugin')) {
            const filePath = join(libDir, file)
            const st = statSync(filePath)
            jars.push({ name: file, path: filePath, size: st.size, isExt: false })
          }
        }
      } catch {
        // ignore
      }
    }

    return jars
  }

  public async installPlugin(pluginId: string): Promise<{ success: boolean; message: string; jarPath?: string }> {
    const jmeterHome = this.getJMeterHome()
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

    await this.downloadFile(plugin.downloadUrl, destPath)

    return {
      success: true,
      message: `Successfully installed "${plugin.name}" (${plugin.jarName}) into ${targetSubDir}.`,
      jarPath: destPath,
    }
  }

  public uninstallPlugin(pluginId: string, jarPath?: string): { success: boolean; message: string } {
    const jmeterHome = this.getJMeterHome()
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

  private downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const getter = url.startsWith('https') ? httpsGet : httpGet

      const request = getter(url, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          this.downloadFile(response.headers.location, destPath)
            .then(resolve)
            .catch(reject)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download plugin: HTTP ${response.statusCode}`))
          return
        }

        const fileStream = createWriteStream(destPath)
        response.pipe(fileStream)

        fileStream.on('finish', () => {
          fileStream.close(() => resolve())
        })

        fileStream.on('error', (err) => {
          unlinkSync(destPath)
          reject(err)
        })
      })

      request.on('error', (err) => {
        if (existsSync(destPath)) unlinkSync(destPath)
        reject(err)
      })

      request.setTimeout(30000, () => {
        request.destroy()
        if (existsSync(destPath)) unlinkSync(destPath)
        reject(new Error('Download timed out.'))
      })
    })
  }
}

export const jmeterPluginsManager = new JMeterPluginsManager()
