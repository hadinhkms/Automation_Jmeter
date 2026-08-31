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
import {
  collectNodeIds,
  deepCloneWithNewIds,
  findNode,
  findParent,
  mapNode,
} from '../utils/treeUtils'

const emptyMetrics: RunMetrics = {
  activeThreads: 0,
  totalThreads: 100,
  samples: 0,
  errors: 0,
  throughput: 0,
  durationSeconds: 0,
}

interface ClipboardState {
  node: TestPlanNode
  mode: 'copy' | 'cut'
  sourceId: string
}

interface JMeterStore {
  testPlan: TestPlanNode
  selectedNodeId: string
  expandedNodeIds: Set<string>
  dirty: boolean
  clipboard: ClipboardState | null
  runState: RunState
  metrics: RunMetrics
  resultsCleared: boolean
  selectNode: (id: string) => void
  toggleExpanded: (id: string) => void
  expandNodes: (ids: string[]) => void
  updateNode: (id: string, updates: Partial<TestPlanNode>) => void
  updateNodeProperties: (id: string, updates: Record<string, unknown>) => void
  addNode: (parentId: string, type: JMeterComponentType) => void
  deleteNode: (id: string) => void
  copyNode: (id: string) => void
  cutNode: (id: string) => void
  pasteNode: (parentId: string) => void
  duplicateNode: (id: string) => void
  toggleEnabled: (id: string) => void
  renameNode: (id: string, name: string) => void
  moveNodeUp: (id: string) => void
  moveNodeDown: (id: string) => void
  replaceTestPlan: (testPlan: TestPlanNode) => void
  newTestPlan: () => void
  markSaved: () => void
  startRun: () => void
  stopRun: () => void
  tickRun: () => void
  clearResults: () => void
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

function initialState() {
  const testPlan = createSampleTestPlan()
  return {
    testPlan,
    selectedNodeId: testPlan.id,
    expandedNodeIds: new Set(collectNodeIds(testPlan)),
  }
}

export const useJMeterStore = create<JMeterStore>((set, get) => ({
  ...initialState(),
  dirty: false,
  clipboard: null,
  runState: 'READY',
  metrics: emptyMetrics,
  resultsCleared: false,

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
  replaceTestPlan: (testPlan) =>
    set({
      testPlan,
      selectedNodeId: testPlan.id,
      expandedNodeIds: new Set(collectNodeIds(testPlan)),
      dirty: false,
      clipboard: null,
      runState: 'READY',
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(testPlan) },
      resultsCleared: false,
    }),
  newTestPlan: () => {
    const testPlan = createNewTestPlan()
    set({
      testPlan,
      selectedNodeId: testPlan.id,
      expandedNodeIds: new Set(collectNodeIds(testPlan)),
      dirty: false,
      clipboard: null,
      runState: 'READY',
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(testPlan) },
      resultsCleared: false,
    })
  },
  markSaved: () => set({ dirty: false }),
  startRun: () =>
    set((state) => ({
      runState: 'RUNNING',
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(state.testPlan) },
      resultsCleared: false,
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
    })),
}))
