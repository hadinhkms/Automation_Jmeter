import type {
  JMeterComponentType,
  RunMetrics,
  RunState,
  TestPlanNode,
} from './jmeter'
import type { StoreApi } from 'zustand'
import type { JtlSample } from '../services/jmeterRunnerService'

export interface ClipboardState {
  node: TestPlanNode
  mode: 'copy' | 'cut'
  sourceId: string
}

export interface LiveLogEntry {
  id: string
  line: string
  type: 'stdout' | 'stderr'
  time: string
}

export interface JMeterLocalConfig {
  path: string
  found: boolean
  version: string | null
}

export interface JMeterStore {
  testPlan: TestPlanNode
  selectedNodeId: string
  expandedNodeIds: Set<string>
  dirty: boolean
  fileName: string | null
  clipboard: ClipboardState | null
  runState: RunState
  metrics: RunMetrics
  resultsCleared: boolean
  executionMode: 'real' | 'mock'
  jmeterConfig: JMeterLocalConfig
  liveLogs: LiveLogEntry[]
  realSamples: JtlSample[]
  realSummaryRows: string[][]
  realAggregateRows: string[][]
  hasHtmlReport: boolean
  activeRunId: string | null
  isConsoleOpen: boolean
  isSettingsOpen: boolean
  selectNode: (id: string) => void
  toggleExpanded: (id: string) => void
  expandNodes: (ids: string[]) => void
  updateNode: (id: string, updates: Partial<TestPlanNode>) => void
  updateNodeProperties: (id: string, updates: Record<string, unknown>) => void
  addNode: (parentId: string, type: JMeterComponentType) => void
  insertNode: (parentId: string, node: TestPlanNode) => void
  deleteNode: (id: string) => void
  copyNode: (id: string) => void
  cutNode: (id: string) => void
  pasteNode: (parentId: string) => void
  duplicateNode: (id: string) => void
  toggleEnabled: (id: string) => void
  renameNode: (id: string, name: string) => void
  moveNodeUp: (id: string) => void
  moveNodeDown: (id: string) => void
  moveNodeToTop: (id: string) => void
  moveNodeToBottom: (id: string) => void
  moveNode: (sourceId: string, targetId: string, position?: 'before' | 'inside' | 'after') => void
  replaceTestPlan: (testPlan: TestPlanNode, fileName?: string) => void

  setFileName: (name: string | null) => void
  newTestPlan: () => void
  markSaved: (fileName?: string) => void
  startRun: () => void
  stopRun: () => void
  tickRun: () => void
  clearResults: () => void
  setExecutionMode: (mode: 'real' | 'mock') => void
  setJMeterConfig: (config: Partial<JMeterLocalConfig>) => void
  setConsoleOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  addLog: (line: string, type?: 'stdout' | 'stderr') => void
  clearLogs: () => void
  startRunResults: (runId: string) => void
  appendRunSamples: (update: {
    runId: string
    samples: JtlSample[]
    summaryRows: string[][]
    aggregateRows: string[][]
    totalSamples: number
    totalErrors: number
    hasReport: boolean
  }) => void
  setRunResults: (results: {
    samples: JtlSample[]
    summaryRows: string[][]
    aggregateRows: string[][]
    hasReport: boolean
    runId?: string
  }) => void
  updateProgressMetrics: (metrics: Partial<RunMetrics>) => void
}

/** Slice creator signature: receives zustand's set/get and returns part of the store. */
export type StoreSet = StoreApi<JMeterStore>['setState']
export type StoreGet = StoreApi<JMeterStore>['getState']
export type SliceCreator<K extends keyof JMeterStore> = (set: StoreSet, get: StoreGet) => Pick<JMeterStore, K>
