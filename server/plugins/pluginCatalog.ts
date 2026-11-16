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
