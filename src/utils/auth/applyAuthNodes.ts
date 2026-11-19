/** Writes Auth-wizard nodes into the tree, updating nodes from an earlier Apply instead of duplicating them. */
import type { TestPlanNode } from '../../models/jmeter'
import { findNode } from '../treeUtils'
import { findAppliedNode } from './oauth2BearerNodes'

export interface AuthNodeTarget {
  getTestPlan: () => TestPlanNode
  insertNode: (parentId: string, node: TestPlanNode) => void
  updateNodeProperties: (id: string, updates: Record<string, unknown>) => void
}

/** Upserts `children` under the sampler and `planLevel` under the Test Plan. Returns true when anything was updated in place. */
export function applyAuthNodes(target: AuthNodeTarget, samplerId: string, children: TestPlanNode[], planLevel: TestPlanNode | null): boolean {
  let updated = false
  const upsert = (parentId: string, child: TestPlanNode) => {
    const existing = findAppliedNode(findNode(target.getTestPlan(), parentId), child)
    if (existing) target.updateNodeProperties(existing.id, child.properties)
    else target.insertNode(parentId, child)
    updated = updated || existing !== null
  }
  if (planLevel) upsert(target.getTestPlan().id, planLevel)
  for (const child of children) upsert(samplerId, child)
  return updated
}
