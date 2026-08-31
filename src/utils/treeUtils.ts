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
