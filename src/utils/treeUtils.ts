import type { TestPlanNode } from '../models/jmeter'
import { createId } from './ids'

export function findNode(
  root: TestPlanNode,
  id: string,
): TestPlanNode | null {
  if (root.id === id) return root
  for (const child of root.children) {
    const match = findNode(child, id)
    if (match) return match
  }
  return null
}

export function findParent(
  root: TestPlanNode,
  id: string,
): TestPlanNode | null {
  if (root.children.some((child) => child.id === id)) return root
  for (const child of root.children) {
    const match = findParent(child, id)
    if (match) return match
  }
  return null
}

export function mapNode(
  root: TestPlanNode,
  id: string,
  updater: (node: TestPlanNode) => TestPlanNode,
): TestPlanNode {
  if (root.id === id) return updater(root)
  return {
    ...root,
    children: root.children.map((child) => mapNode(child, id, updater)),
  }
}

export function deepCloneWithNewIds(
  node: TestPlanNode,
  renameRoot = false,
): TestPlanNode {
  return {
    ...node,
    id: createId(),
    name: renameRoot ? `${node.name} Copy` : node.name,
    properties: structuredClone(node.properties),
    metadata: node.metadata ? { ...node.metadata } : undefined,
    children: node.children.map((child) => deepCloneWithNewIds(child)),
  }
}

export function collectNodeIds(node: TestPlanNode): string[] {
  return [node.id, ...node.children.flatMap(collectNodeIds)]
}

export function isDescendant(node: TestPlanNode, targetId: string): boolean {
  if (node.id === targetId) return true
  return node.children.some((child) => isDescendant(child, targetId))
}

export function moveNodeInTree(
  root: TestPlanNode,
  sourceId: string,
  targetId: string,
  position: 'before' | 'inside' | 'after' = 'before',
): TestPlanNode | null {
  if (sourceId === root.id || sourceId === targetId) return null
  const sourceNode = findNode(root, sourceId)
  if (!sourceNode) return null

  // Check circular reference
  if (isDescendant(sourceNode, targetId)) return null

  // Helper to remove source node from tree
  function removeNode(node: TestPlanNode): TestPlanNode {
    return {
      ...node,
      children: node.children
        .filter((child) => child.id !== sourceId)
        .map(removeNode),
    }
  }

  const cleanedRoot = removeNode(root)

  // If dropping inside target
  if (position === 'inside') {
    return mapNode(cleanedRoot, targetId, (target) => ({
      ...target,
      children: [sourceNode, ...target.children],
    }))
  }

  // If dropping before or after target
  const targetParent = findParent(cleanedRoot, targetId)
  if (!targetParent) {
    // If target is root
    return mapNode(cleanedRoot, root.id, (r) => ({
      ...r,
      children: position === 'before' ? [sourceNode, ...r.children] : [...r.children, sourceNode],
    }))
  }

  return mapNode(cleanedRoot, targetParent.id, (parent) => {
    const targetIndex = parent.children.findIndex((c) => c.id === targetId)
    if (targetIndex === -1) {
      return { ...parent, children: [...parent.children, sourceNode] }
    }
    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
    const newChildren = [...parent.children]
    newChildren.splice(insertIndex, 0, sourceNode)
    return { ...parent, children: newChildren }
  })
}

export function moveNodeToTopInTree(root: TestPlanNode, id: string): TestPlanNode {
  const parent = findParent(root, id)
  if (!parent) return root
  const index = parent.children.findIndex((c) => c.id === id)
  if (index <= 0) return root
  const node = parent.children[index]
  return mapNode(root, parent.id, (p) => {
    const children = [node, ...p.children.filter((c) => c.id !== id)]
    return { ...p, children }
  })
}

