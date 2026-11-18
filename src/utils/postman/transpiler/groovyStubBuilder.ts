import type { TestPlanNode } from '../../../models/jmeter'
import { createNode } from '../../../mock/sampleTestPlan'

/** Lines that are only structure (pm.test wrappers, closing braces, json() parsing) need no translation. */
const STRUCTURAL_LINE = /^(?:pm\.test\s*\(.*function\s*\(\s*\)\s*\{|pm\.test\s*\(.*=>\s*\{|\}\s*\)\s*;?|\}|(?:var|let|const)\s+\w+\s*=\s*(?:pm\.response\.json\(\)|JSON\.parse\(responseBody\))\s*;?|\/\/.*)$/

const GUIDE = `// ---- Postman -> JMeter (Groovy) quick reference ----
// pm.response.json()              -> new groovy.json.JsonSlurper().parseText(prev.getResponseDataAsString())
// pm.response.text()              -> prev.getResponseDataAsString()
// pm.response.code                -> prev.getResponseCode() as Integer
// pm.response.headers.get("X")    -> prev.getResponseHeaders()  (raw text, parse the "X:" line)
// pm.response.responseTime        -> prev.getTime()
// pm.environment.get/set("k", v)  -> vars.get("k") / vars.put("k", String.valueOf(v))
// pm.globals.set("k", v)          -> props.put("k", String.valueOf(v))
// pm.expect(x).to.eql(y)          -> if (x != y) { AssertionResult.setFailure(true); AssertionResult.setFailureMessage("...") }
// console.log(x)                  -> log.info(String.valueOf(x))`

/** Lines that contain Postman API calls and were not consumed by any rule. */
export function findUntranslatedLines(script: string, consumed: Array<[number, number]>): string[] {
  const lines: string[] = []
  let offset = 0
  for (const raw of script.split('\n')) {
    const start = offset
    const end = offset + raw.length
    offset = end + 1
    const line = raw.trim()
    if (!line || STRUCTURAL_LINE.test(line)) continue
    const covered = consumed.some(([s, e]) => s < end && e > start)
    if (!covered && /\b(?:pm|postman|responseBody|responseCode|tests)\b/.test(line)) lines.push(line)
  }
  return lines
}

/** JSR223 Groovy assertion stub: original logic commented out plus a translation guide. */
export function buildGroovyStub(requestName: string, lines: string[], fullScript: string, partial: boolean): TestPlanNode {
  const original = (partial ? lines.join('\n') : fullScript).replace(/\*\//g, '* /')
  const header = partial
    ? `// Transpiled Postman script — ${lines.length} line(s) could not be converted automatically.\n// The other checks were generated as JMeter assertions/extractors next to this one.`
    : '// Transpiled Postman script — no rule matched, translate manually.'
  return createNode('JSR223Assertion', `Postman Script Stub (${requestName})`, {
    language: 'groovy',
    script: `${header}\n${GUIDE}\n\n/* Original Postman script:\n${original}\n*/\n`,
  })
}
