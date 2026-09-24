// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { create } from 'zustand'
import type {
  JMeterComponentType,
  RunMetrics,
  RunState,
  TestPlanNode,
} from '../models/jmeter'
import { canAddChild } from '../rules/componentRules'
import {
  createNewTestPlan,
  createNode,
  createSampleTestPlan,
} from '../mock/sampleTestPlan'
import { normalizeDirectoryVariablesInTree } from '../utils/jmeterPathVariables'
import {
  collectNodeIds,
  deepCloneWithNewIds,
  findNode,
  findParent,
  mapNode,
  moveNodeInTree,
  moveNodeToTopInTree,
} from '../utils/treeUtils'


const emptyMetrics: RunMetrics = {
  activeThreads: 0,
  totalThreads: 100,
  samples: 0,
  errors: 0,
  throughput: 0,
  durationSeconds: 0,
}

const STORAGE_KEY = 'jmeter_web_active_plan_v1'

function defaultExpandedNodeIds(testPlan: TestPlanNode): Set<string> {
  return new Set([testPlan.id])
}

function restoreExpandedNodeIds(testPlan: TestPlanNode, savedExpandedIds: unknown): Set<string> {
  if (!Array.isArray(savedExpandedIds)) return defaultExpandedNodeIds(testPlan)

  const expandedNodeIds = new Set(savedExpandedIds.filter((id): id is string => typeof id === 'string'))
  const allNodeIds = collectNodeIds(testPlan)
  const isLegacyFullExpand = allNodeIds.length > 20 && allNodeIds.every((id) => expandedNodeIds.has(id))

  return isLegacyFullExpand ? defaultExpandedNodeIds(testPlan) : expandedNodeIds
}

interface PersistedState {
  testPlan: TestPlanNode
  selectedNodeId: string
  expandedNodeIds: string[]
  dirty: boolean
  fileName: string | null
}

function loadInitialState(): {
  testPlan: TestPlanNode
  selectedNodeId: string
  expandedNodeIds: Set<string>
  dirty: boolean
  fileName: string | null
} {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState
      if (parsed && parsed.testPlan && parsed.testPlan.id) {
        const testPlan = normalizeDirectoryVariablesInTree(parsed.testPlan)
        const selectedNodeId = findNode(testPlan, parsed.selectedNodeId) ? parsed.selectedNodeId : testPlan.id
        const expandedNodeIds = restoreExpandedNodeIds(testPlan, parsed.expandedNodeIds)
        return {
          testPlan,
          selectedNodeId,
          expandedNodeIds,
          dirty: Boolean(parsed.dirty),
          fileName: parsed.fileName || null,
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load persisted state from localStorage:', error)
  }

  const testPlan = normalizeDirectoryVariablesInTree(createSampleTestPlan())
  return {
    testPlan,
    selectedNodeId: testPlan.id,
    expandedNodeIds: defaultExpandedNodeIds(testPlan),
    dirty: false,
    fileName: null,
  }
}

function persistState(state: {
  testPlan: TestPlanNode
  selectedNodeId: string
  expandedNodeIds: Set<string>
  dirty: boolean
  fileName: string | null
}) {
  try {
    if (typeof localStorage === 'undefined') return
    const payload: PersistedState = {
      testPlan: state.testPlan,
      selectedNodeId: state.selectedNodeId,
      expandedNodeIds: Array.from(state.expandedNodeIds),
      dirty: state.dirty,
      fileName: state.fileName,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('Failed to persist state to localStorage:', error)
  }
}

import type { JtlSample } from '../services/jmeterRunnerService'

interface ClipboardState {
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

interface JMeterStore {
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

function getTotalThreads(root: TestPlanNode): number {
  let total = 0
  const visit = (node: TestPlanNode) => {
    if (node.type === 'ThreadGroup' && node.enabled) {
      total += Number(node.properties.threads) || 0
    }
    node.children.forEach(visit)
  }
  visit(root)
  return Math.max(total, 1)
}

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

  selectNode: (id) => set({ selectedNodeId: id }),
  toggleExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedNodeIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { expandedNodeIds: next }
    }),
  expandNodes: (ids) =>
    set((state) => ({ expandedNodeIds: new Set([...state.expandedNodeIds, ...ids]) })),
  updateNode: (id, updates) =>
    set((state) => ({
      testPlan: mapNode(state.testPlan, id, (node) => ({ ...node, ...updates })),
      dirty: true,
    })),
  updateNodeProperties: (id, updates) =>
    set((state) => ({
      testPlan: mapNode(state.testPlan, id, (node) => ({
        ...node,
        properties: { ...node.properties, ...updates },
      })),
      dirty: true,
    })),
  addNode: (parentId, type) =>
    set((state) => {
      const parent = findNode(state.testPlan, parentId)
      if (!parent || !canAddChild(parent.type, type)) return state
      const node = createNode(type)
      return {
        testPlan: mapNode(state.testPlan, parentId, (current) => ({
          ...current,
          children: [...current.children, node],
        })),
        selectedNodeId: node.id,
        expandedNodeIds: new Set([...state.expandedNodeIds, parentId]),
        dirty: true,
      }
    }),
  insertNode: (parentId, node) =>
    set((state) => {
      let targetParent = findNode(state.testPlan, parentId)
      if (!targetParent || !canAddChild(targetParent.type, node.type)) {
        const parentOfTarget = targetParent ? findParent(state.testPlan, targetParent.id) : null
        if (parentOfTarget && canAddChild(parentOfTarget.type, node.type)) {
          targetParent = parentOfTarget
        } else {
          const firstTg = state.testPlan.children.find((c) => c.type === 'ThreadGroup')
          if (firstTg) {
            targetParent = firstTg
          } else {
            targetParent = state.testPlan
          }
        }
      }

      return {
        testPlan: mapNode(state.testPlan, targetParent.id, (current) => ({
          ...current,
          children: [...current.children, node],
        })),
        selectedNodeId: node.id,
        expandedNodeIds: new Set([...state.expandedNodeIds, targetParent.id]),
        dirty: true,
      }
    }),
  deleteNode: (id) =>
    set((state) => {
      if (id === state.testPlan.id) return state
      const parent = findParent(state.testPlan, id)
      if (!parent) return state
      return {
        testPlan: mapNode(state.testPlan, parent.id, (node) => ({
          ...node,
          children: node.children.filter((child) => child.id !== id),
        })),
        selectedNodeId: parent.id,
        dirty: true,
      }
    }),
  copyNode: (id) => {
    const node = findNode(get().testPlan, id)
    if (node) set({ clipboard: { node: structuredClone(node), mode: 'copy', sourceId: id } })
  },
  cutNode: (id) => {
    const state = get()
    const node = findNode(state.testPlan, id)
    if (node && id !== state.testPlan.id) {
      set({ clipboard: { node: structuredClone(node), mode: 'cut', sourceId: id } })
    }
  },
  pasteNode: (parentId) =>
    set((state) => {
      const parent = findNode(state.testPlan, parentId)
      const clipboard = state.clipboard
      if (!parent || !clipboard || !canAddChild(parent.type, clipboard.node.type)) return state
      if (clipboard.mode === 'cut' && findNode(clipboard.node, parentId)) return state
      const clone = deepCloneWithNewIds(clipboard.node)
      let testPlan = state.testPlan
      if (clipboard.mode === 'cut') {
        const sourceParent = findParent(testPlan, clipboard.sourceId)
        if (sourceParent) {
          testPlan = mapNode(testPlan, sourceParent.id, (node) => ({
            ...node,
            children: node.children.filter((child) => child.id !== clipboard.sourceId),
          }))
        }
      }
      testPlan = mapNode(testPlan, parentId, (node) => ({
        ...node,
        children: [...node.children, clone],
      }))
      return {
        testPlan,
        selectedNodeId: clone.id,
        expandedNodeIds: new Set([...state.expandedNodeIds, parentId]),
        clipboard: clipboard.mode === 'cut' ? null : clipboard,
        dirty: true,
      }
    }),
  duplicateNode: (id) =>
    set((state) => {
      const node = findNode(state.testPlan, id)
      const parent = findParent(state.testPlan, id)
      if (!node || !parent) return state
      const clone = deepCloneWithNewIds(node, true)
      const index = parent.children.findIndex((child) => child.id === id)
      return {
        testPlan: mapNode(state.testPlan, parent.id, (current) => ({
          ...current,
          children: [
            ...current.children.slice(0, index + 1),
            clone,
            ...current.children.slice(index + 1),
          ],
        })),
        selectedNodeId: clone.id,
        dirty: true,
      }
    }),
  toggleEnabled: (id) =>
    set((state) => ({
      testPlan: mapNode(state.testPlan, id, (node) => ({ ...node, enabled: !node.enabled })),
      dirty: true,
    })),
  renameNode: (id, name) => {
    const trimmed = name.trim()
    if (trimmed) get().updateNode(id, { name: trimmed })
  },
  moveNodeUp: (id) =>
    set((state) => {
      const parent = findParent(state.testPlan, id)
      if (!parent) return state
      const index = parent.children.findIndex((child) => child.id === id)
      if (index <= 0) return state
      return {
        testPlan: mapNode(state.testPlan, parent.id, (node) => {
          const children = [...node.children]
          ;[children[index - 1], children[index]] = [children[index], children[index - 1]]
          return { ...node, children }
        }),
        dirty: true,
      }
    }),
  moveNodeDown: (id) =>
    set((state) => {
      const parent = findParent(state.testPlan, id)
      if (!parent) return state
      const index = parent.children.findIndex((child) => child.id === id)
      if (index < 0 || index >= parent.children.length - 1) return state
      return {
        testPlan: mapNode(state.testPlan, parent.id, (node) => {
          const children = [...node.children]
          ;[children[index], children[index + 1]] = [children[index + 1], children[index]]
          return { ...node, children }
        }),
        dirty: true,
      }
    }),
  moveNodeToTop: (id) =>
    set((state) => ({
      testPlan: moveNodeToTopInTree(state.testPlan, id),
      dirty: true,
    })),
  moveNodeToBottom: (id) =>
    set((state) => {
      const parent = findParent(state.testPlan, id)
      if (!parent) return state
      const node = findNode(state.testPlan, id)
      if (!node) return state
      return {
        testPlan: mapNode(state.testPlan, parent.id, (p) => ({
          ...p,
          children: [...p.children.filter((c) => c.id !== id), node],
        })),
        dirty: true,
      }
    }),
  moveNode: (sourceId, targetId, position = 'before') =>
    set((state) => {
      const updated = moveNodeInTree(state.testPlan, sourceId, targetId, position)
      if (!updated) return state
      return {
        testPlan: updated,
        dirty: true,
      }
    }),
  replaceTestPlan: (testPlan, fileName) =>

    set({
      testPlan: normalizeDirectoryVariablesInTree(testPlan),
      selectedNodeId: testPlan.id,
      expandedNodeIds: defaultExpandedNodeIds(testPlan),
      dirty: false,
      fileName: fileName ?? null,
      clipboard: null,
      runState: 'READY',
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(testPlan) },
      resultsCleared: false,
    }),
  newTestPlan: () => {
    const testPlan = normalizeDirectoryVariablesInTree(createNewTestPlan())
    set({
      testPlan,
      selectedNodeId: testPlan.id,
      expandedNodeIds: defaultExpandedNodeIds(testPlan),
      dirty: false,
      fileName: null,
      clipboard: null,
      runState: 'READY',
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(testPlan) },
      resultsCleared: false,
    })
  },
  setFileName: (name) => set({ fileName: name ? (name.endsWith('.jmx') ? name : `${name}.jmx`) : null }),
  markSaved: (fileName) =>
    set((state) => ({
      dirty: false,
      fileName: fileName ? (fileName.endsWith('.jmx') ? fileName : `${fileName}.jmx`) : state.fileName,
    })),
  startRun: () =>
    set((state) => ({
      runState: 'RUNNING',
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(state.testPlan) },
      resultsCleared: false,
      realSamples: [],
      realSummaryRows: [],
      realAggregateRows: [],
      hasHtmlReport: false,
      activeRunId: null,
    })),
  stopRun: () => set({ runState: 'STOPPED', metrics: { ...get().metrics, activeThreads: 0 } }),
  tickRun: () =>
    set((state) => {
      if (state.runState !== 'RUNNING') return state
      const nextDuration = state.metrics.durationSeconds + 1
      const activeThreads = Math.min(
        state.metrics.totalThreads,
        Math.max(1, Math.round(nextDuration * (state.metrics.totalThreads / 12))),
      )
      const increment = 78 + Math.floor(Math.random() * 65)
      const newErrors = Math.random() > 0.78 ? 1 + Math.floor(Math.random() * 2) : 0
      return {
        metrics: {
          ...state.metrics,
          activeThreads,
          samples: state.metrics.samples + increment,
          errors: state.metrics.errors + newErrors,
          throughput: increment,
          durationSeconds: nextDuration,
        },
      }
    }),
  clearResults: () =>
    set((state) => ({
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(state.testPlan) },
      runState: state.runState === 'RUNNING' ? 'RUNNING' : 'READY',
      resultsCleared: true,
      realSamples: [],
      realSummaryRows: [],
      realAggregateRows: [],
      liveLogs: [],
      hasHtmlReport: false,
    })),
  setExecutionMode: (executionMode) => set({ executionMode }),
  setJMeterConfig: (config) =>
    set((state) => ({ jmeterConfig: { ...state.jmeterConfig, ...config } })),
  setConsoleOpen: (isConsoleOpen) => set({ isConsoleOpen }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  addLog: (line, type = 'stdout') =>
    set((state) => ({
      liveLogs: [
        ...state.liveLogs.slice(-299),
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          line,
          type,
          time: new Date().toLocaleTimeString(),
        },
      ],
    })),
  clearLogs: () => set({ liveLogs: [] }),
  startRunResults: (runId) =>
    set((state) => {
      if (state.activeRunId === runId) {
        return {
          activeRunId: runId,
          hasHtmlReport: false,
          resultsCleared: false,
        }
      }

      return {
        activeRunId: runId,
        realSamples: [],
        realSummaryRows: [],
        realAggregateRows: [],
        hasHtmlReport: false,
        resultsCleared: false,
      }
    }),
  appendRunSamples: (update) =>
    set((state) => {
      const shouldReplace = Boolean(state.activeRunId && state.activeRunId !== update.runId)
      const currentSamples = shouldReplace ? [] : state.realSamples
      const merged = shouldReplace ? [...update.samples] : [...currentSamples]
      const indexById = new Map(merged.map((sample, index) => [sample.id, index]))

      if (!shouldReplace) {
        for (const sample of update.samples) {
          const index = indexById.get(sample.id)
          if (index === undefined) {
            indexById.set(sample.id, merged.length)
            merged.push(sample)
          } else {
            merged[index] = sample
          }
        }
      }

      const errors = merged.filter((sample) => !sample.success).length

      return {
        activeRunId: update.runId,
        realSamples: merged,
        realSummaryRows: update.summaryRows,
        realAggregateRows: update.aggregateRows,
        hasHtmlReport: update.hasReport,
        resultsCleared: false,
        metrics: {
          ...state.metrics,
          samples: Math.max(state.metrics.samples, update.totalSamples),
          errors: Math.max(state.metrics.errors, update.totalErrors, errors),
        },
      }
    }),
  setRunResults: (results) =>
    set({
      realSamples: results.samples,
      realSummaryRows: results.summaryRows,
      realAggregateRows: results.aggregateRows,
      hasHtmlReport: results.hasReport,
      activeRunId: results.runId ?? null,
      resultsCleared: false,
    }),
  updateProgressMetrics: (metrics) =>
    set((state) => ({
      metrics: {
        ...state.metrics,
        ...metrics,
        samples: metrics.samples === undefined ? state.metrics.samples : Math.max(state.metrics.samples, metrics.samples),
        errors: metrics.errors === undefined ? state.metrics.errors : Math.max(state.metrics.errors, metrics.errors),
      },
    })),
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
