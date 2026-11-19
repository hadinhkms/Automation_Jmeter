import type { TestPlanNode } from '../../models/jmeter'
import { findBlocks, isConditionalAt } from './transpiler/blockContext'
import { CHAI_RULES } from './transpiler/chaiRules'
import { buildGroovyStub } from './transpiler/groovyStubBuilder'
import { joinContinuationLines, stripComments } from './transpiler/scriptPreprocess'
import { findUntranslatedLines, PM_USAGE } from './transpiler/untranslatedLines'

/**
 * Chai Transpiler v2 (FEAT-P3c): converts a Postman test script into native JMeter
 * assertions/extractors, and adds a JSR223 Groovy stub (with a translation guide)
 * for any Postman logic that no rule could convert.
 *
 * Comments are ignored, chained continuation lines are joined, and checks inside
 * `if`/loop blocks are left to the stub (a native assertion would run unconditionally).
 */
export function transpilePostmanScript(script: string, requestName = 'Request'): TestPlanNode[] {
  if (!script || !script.trim()) return []

  const cleanScript = script.trim()
  const code = joinContinuationLines(stripComments(cleanScript))
  const blocks = findBlocks(code)
  const generated: TestPlanNode[] = []
  const seen = new Set<string>()
  const consumed: Array<[number, number]> = []

  for (const rule of CHAI_RULES) {
    rule.regex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = rule.regex.exec(code)) !== null) {
      if (isConditionalAt(code, match.index, blocks)) continue
      const result = rule.build(match)
      if (!result) continue
      consumed.push([match.index, match.index + match[0].length])
      if (!seen.has(result.key)) {
        seen.add(result.key)
        generated.push(result.node)
      }
    }
  }

  const leftovers = findUntranslatedLines(code, consumed, blocks)
  if (generated.length === 0 && PM_USAGE.test(code)) {
    generated.push(buildGroovyStub(requestName, leftovers, cleanScript, false))
  } else if (generated.length > 0 && leftovers.length > 0) {
    generated.push(buildGroovyStub(requestName, leftovers, cleanScript, true))
  }

  return generated
}
