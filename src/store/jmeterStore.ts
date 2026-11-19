import { create } from 'zustand'
import { normalizeDirectoryVariablesInTree } from '../utils/jmeterPathVariables'
import { emptyMetrics, loadInitialState, persistState } from './jmeterStorePersistence'
import type { JMeterStore } from '../models/jmeterStore'
import { createTreeSlice } from './slices/treeSlice'
import { createClipboardSlice } from './slices/clipboardSlice'
import { createMoveSlice } from './slices/moveSlice'
import { createPlanSlice } from './slices/planSlice'
import { createRunSlice } from './slices/runSlice'
import { createResultsSlice } from './slices/resultsSlice'

export type { LiveLogEntry, JMeterLocalConfig } from '../models/jmeterStore'

const initial = loadInitialState()

export const useJMeterStore = create<JMeterStore>((set, get) => ({
  testPlan: initial.testPlan,
  selectedNodeId: initial.selectedNodeId,
  expandedNodeIds: initial.expandedNodeIds,
  dirty: initial.dirty,
  fileName: initial.fileName,
  clipboard: null,
  runState: 'READY',
  metrics: emptyMetrics,
  resultsCleared: false,
  executionMode: 'real',
  jmeterConfig: { path: '', found: false, version: null },
  liveLogs: [],
  realSamples: [],
  realSummaryRows: [],
  realAggregateRows: [],
  hasHtmlReport: false,
  activeRunId: null,
  isConsoleOpen: false,
  isSettingsOpen: false,

  ...createTreeSlice(set, get),
  ...createClipboardSlice(set, get),
  ...createMoveSlice(set, get),
  ...createPlanSlice(set, get),
  ...createRunSlice(set, get),
  ...createResultsSlice(set, get),
}))


useJMeterStore.subscribe((state) => {
  persistState({
    testPlan: state.testPlan,
    selectedNodeId: state.selectedNodeId,
    expandedNodeIds: state.expandedNodeIds,
    dirty: state.dirty,
    fileName: state.fileName,
  })
})

const currentState = useJMeterStore.getState()
const normalizedTestPlan = normalizeDirectoryVariablesInTree(currentState.testPlan)
if (normalizedTestPlan !== currentState.testPlan) {
  useJMeterStore.setState({
    testPlan: normalizedTestPlan,
    dirty: true,
  })
}
