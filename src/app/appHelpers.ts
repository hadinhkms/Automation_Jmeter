import type { JMeterComponentType, TestPlanNode } from '../models/jmeter'
import type { JMeterStore } from '../models/jmeterStore'

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}

export function findNodePathByType(node: TestPlanNode, type: JMeterComponentType, path: string[] = []): string[] | null {
  const nextPath = [...path, node.id]
  if (node.type === type) return nextPath

  for (const child of node.children) {
    const found = findNodePathByType(child, type, nextPath)
    if (found) return found
  }

  return null
}

/** Expand the tree down to the first View Results Tree listener and select it. */
export function selectResultsListenerNode(store: Pick<JMeterStore, 'testPlan' | 'expandNodes' | 'selectNode'>) {
  const resultsPath = findNodePathByType(store.testPlan, 'ViewResultsTree')
  if (!resultsPath) return

  store.expandNodes(resultsPath.slice(0, -1))
  store.selectNode(resultsPath[resultsPath.length - 1])
}
