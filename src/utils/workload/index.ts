import type { TestPlanNode } from '../../models/jmeter'
import type { ThreadGroupCurve } from './types'
import {
  parseStandardThreadGroup,
  parseConcurrencyThreadGroup,
  parseSteppingThreadGroup,
  parseUltimateThreadGroup,
} from './threadGroupParsers'

export * from './types'
export * from './compositeCurve'

export function extractThreadGroupCurves(node: TestPlanNode): ThreadGroupCurve[] {
  const curves: ThreadGroupCurve[] = []
  function traverse(n: TestPlanNode) {
    if (!n.enabled) return
    if (n.type === 'ThreadGroup') curves.push(parseStandardThreadGroup(n))
    else if (n.type === 'ConcurrencyThreadGroup') curves.push(parseConcurrencyThreadGroup(n))
    else if (n.type === 'SteppingThreadGroup') curves.push(parseSteppingThreadGroup(n))
    else if (n.type === 'UltimateThreadGroup') curves.push(parseUltimateThreadGroup(n))
    n.children.forEach(traverse)
  }
  traverse(node)
  return curves
}
