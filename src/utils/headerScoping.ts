import type { TableRow, TestPlanNode } from '../models/jmeter'

/**
 * Finds the parent chain from root down to the target node.
 * Returns array of ancestors (excluding targetNode itself), or null if not found.
 */
export function findParentPath(
  root: TestPlanNode,
  targetId: string,
  currentPath: TestPlanNode[] = [],
): TestPlanNode[] | null {
  if (root.id === targetId) return currentPath
  for (const child of root.children) {
    const res = findParentPath(child, targetId, [...currentPath, root])
    if (res) return res
  }
  return null
}

/**
 * Resolves cascaded HTTP headers following JMeter hierarchy:
 * TestPlan -> ThreadGroup -> ... -> HTTPRequest.
 * Later headers (more specific / child) overwrite earlier ones with the same header name.
 */
export function resolveCascadedHeaders(
  targetNode: TestPlanNode,
  rootNode: TestPlanNode,
): Array<{ name: string; value: string }> {
  const parents = findParentPath(rootNode, targetNode.id) || []
  const allNodes = [...parents, targetNode]
  const headerMap = new Map<string, { originalName: string; value: string }>()

  for (const n of allNodes) {
    for (const child of n.children) {
      if (child.type === 'HTTPHeaderManager' && child.enabled !== false) {
        const rows = (child.properties.headers as TableRow[]) || []
        for (const row of rows) {
          if (row.name) {
            const key = String(row.name).trim().toLowerCase()
            headerMap.set(key, {
              originalName: String(row.name).trim(),
              value: String(row.value ?? ''),
            })
          }
        }
      }
    }
  }

  return Array.from(headerMap.values()).map((h) => ({
    name: h.originalName,
    value: h.value,
  }))
}
