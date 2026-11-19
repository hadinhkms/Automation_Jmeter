import type { RunMetrics, TestPlanNode } from '../models/jmeter'
import { createSampleTestPlan } from '../mock/sampleTestPlan'
import { upgradeUnsupportedNodes } from '../jmx/upgradeUnsupported'
import { normalizeDirectoryVariablesInTree } from '../utils/jmeterPathVariables'
import { collectNodeIds, findNode } from '../utils/treeUtils'

export const emptyMetrics: RunMetrics = {
  activeThreads: 0,
  totalThreads: 100,
  samples: 0,
  errors: 0,
  throughput: 0,
  durationSeconds: 0,
}

const STORAGE_KEY = 'jmeter_web_active_plan_v1'

export function defaultExpandedNodeIds(testPlan: TestPlanNode): Set<string> {
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

export function loadInitialState(): {
  testPlan: TestPlanNode
  selectedNodeId: string
  expandedNodeIds: Set<string>
  dirty: boolean
  fileName: string | null
} {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      // SAFETY: written by persistState in this shape; testPlan.id is checked right below and errors fall back to defaults
      const parsed = JSON.parse(raw) as PersistedState
      if (parsed && parsed.testPlan && parsed.testPlan.id) {
        const testPlan = normalizeDirectoryVariablesInTree(upgradeUnsupportedNodes(parsed.testPlan))
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

export function persistState(state: {
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

export function getTotalThreads(root: TestPlanNode): number {
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
