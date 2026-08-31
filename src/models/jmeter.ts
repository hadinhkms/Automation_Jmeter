export type JMeterComponentType =
  | 'TestPlan'
  | 'UserDefinedVariables'
  | 'ThreadGroup'
  | 'HTTPRequestDefaults'
  | 'HTTPRequest'
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
  | 'JSR223Sampler'
  | 'JSR223PreProcessor'
  | 'JSR223PostProcessor'
  | 'JSR223Assertion'
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

export type TableRow = Record<string, string | boolean>
