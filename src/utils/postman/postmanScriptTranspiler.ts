import type { TestPlanNode } from '../../models/jmeter'
import { CHAI_RULES } from './transpiler/chaiRules'
import { buildGroovyStub, findUntranslatedLines } from './transpiler/groovyStubBuilder'

/**
 * Chai Transpiler v2 (FEAT-P3c): converts a Postman test script into native JMeter
 * assertions/extractors, and adds a JSR223 Groovy stub (with a translation guide)
 * for any Postman logic that no rule could convert.
 */
export function transpilePostmanScript(script: string, requestName = 'Request'): TestPlanNode[] {
  if (!script || !script.trim()) return []

  const cleanScript = script.trim()
  const generated: TestPlanNode[] = []
  const seen = new Set<string>()
  const consumed: Array<[number, number]> = []

  for (const rule of CHAI_RULES) {
    rule.regex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = rule.regex.exec(cleanScript)) !== null) {
      consumed.push([match.index, match.index + match[0].length])
      const result = rule.build(match)
      if (result && !seen.has(result.key)) {
        seen.add(result.key)
        generated.push(result.node)
      }
    }
  }

  const leftovers = findUntranslatedLines(cleanScript, consumed)
  if (generated.length === 0 && /\b(?:pm|postman|responseBody|responseCode|tests)\b/.test(cleanScript)) {
    generated.push(buildGroovyStub(requestName, leftovers, cleanScript, false))
  } else if (generated.length > 0 && leftovers.length > 0) {
    generated.push(buildGroovyStub(requestName, leftovers, cleanScript, true))
  }

  return generated
}
