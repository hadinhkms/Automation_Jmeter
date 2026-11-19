import { canAddChild } from '../../rules/componentRules'
import { deepCloneWithNewIds, findNode, findParent, mapNode } from '../../utils/treeUtils'
import type { SliceCreator } from '../../models/jmeterStore'

type ClipboardKeys = 'copyNode' | 'cutNode' | 'pasteNode' | 'duplicateNode' | 'toggleEnabled' | 'renameNode'

export const createClipboardSlice: SliceCreator<ClipboardKeys> = (set, get) => ({
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
})
