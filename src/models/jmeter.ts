export type JMeterComponentType =
  | 'TestPlan'
  | 'UserDefinedVariables'
  | 'ThreadGroup'
  | 'ConcurrencyThreadGroup'
  | 'SteppingThreadGroup'
  | 'UltimateThreadGroup'
  | 'HTTPRequestDefaults'
  | 'HTTPRequest'
  | 'GraphQLSampler'
  | 'WebSocketOpenSampler'
  | 'WebSocketSingleWriteSampler'
  | 'WebSocketSingleReadSampler'
  | 'WebSocketCloseSampler'
  | 'HTTPHeaderManager'
  | 'HTTPCookieManager'
  | 'CSVDataSet'
  | 'TransactionController'
  | 'IfController'
  | 'LoopController'
  | 'ConstantTimer'
  | 'JSONExtractor'
  | 'RegexExtractor'
  | 'ResponseAssertion'
  | 'DebugSampler'
  | 'JSR223Sampler'
  | 'JSR223PreProcessor'
  | 'JSR223PostProcessor'
  | 'JSR223Assertion'
  | 'ModuleController'
  | 'TestFragmentController'
  | 'BeanShellPostProcessor'
  | 'BackendListener'
  | 'ViewResultsTree'
  | 'SummaryReport'
  | 'AggregateReport'
  | 'UnsupportedComponent'

export interface TestPlanNode {
  id: string
  type: JMeterComponentType
  name: string
  enabled: boolean
  properties: Record<string, unknown>
  children: TestPlanNode[]
  metadata?: {
    rawXml?: string
    originalClass?: string
  }
}

export type RunState = 'READY' | 'RUNNING' | 'STOPPED'

export interface RunMetrics {
  activeThreads: number
  totalThreads: number
  samples: number
  errors: number
  throughput: number
  durationSeconds: number
}

export interface SlaThresholds {
  enabled: boolean
  maxAvgLatencyMs?: number
  maxP90LatencyMs?: number
  maxP95LatencyMs?: number
  maxP99LatencyMs?: number
  maxErrorRatePercent?: number
  minThroughputRps?: number
  maxFailedTransactions?: number
}

export interface SlaEvaluationResult {
  passed: boolean
  evaluatedAt: number
  rules: {
    name: string
    actual: number
    target: number
    passed: boolean
    unit: string
    operator: '<=' | '>='
  }[]
  summaryText: string
}

export interface DistributedNodeConfig {
  enabled: boolean
  remoteHosts: string[]
}

export interface WebhookConfig {
  enabled: boolean
  url: string
  type: 'discord' | 'slack' | 'teams' | 'generic'
  notifyOnPass: boolean
  notifyOnFail: boolean
}

export type TableRow = Record<string, string | boolean>

