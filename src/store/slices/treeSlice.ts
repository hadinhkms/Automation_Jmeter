import { canAddChild } from '../../rules/componentRules'
import { createNode } from '../../mock/sampleTestPlan'
import { findNode, findParent, mapNode } from '../../utils/treeUtils'
import type { SliceCreator } from '../../models/jmeterStore'

type TreeKeys =
  | 'selectNode'
  | 'toggleExpanded'
  | 'expandNodes'
  | 'updateNode'
  | 'updateNodeProperties'
  | 'addNode'
  | 'insertNode'
  | 'deleteNode'

export const createTreeSlice: SliceCreator<TreeKeys> = (set) => ({
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
})
