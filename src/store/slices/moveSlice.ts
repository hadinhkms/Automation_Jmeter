import {
  findNode,
  findParent,
  mapNode,
  moveNodeInTree,
  moveNodeToTopInTree,
} from '../../utils/treeUtils'
import type { SliceCreator } from '../../models/jmeterStore'

type MoveKeys = 'moveNodeUp' | 'moveNodeDown' | 'moveNodeToTop' | 'moveNodeToBottom' | 'moveNode'

export const createMoveSlice: SliceCreator<MoveKeys> = (set) => ({
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
})
