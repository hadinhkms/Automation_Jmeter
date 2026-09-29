import type { TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'

export function transpilePostmanScript(script: string, requestName = 'Request'): TestPlanNode[] {
  if (!script || !script.trim()) return []

  const generatedNodes: TestPlanNode[] = []
  const cleanScript = script.trim()

  // 1. Status Code assertions: pm.response.to.have.status(200), responseCode.code === 200, pm.expect(pm.response.code).to.eq(200)
  const statusRegex = /(?:pm\.response\.to\.(?:have|be)\.status|pm\.expect\(pm\.response\.code\)\.to\.(?:eq|equal)|responseCode\.code\s*===?)\s*\(?\s*(\d{3})\s*\)?/g
  let statusMatch: RegExpExecArray | null
  const seenStatusCodes = new Set<string>()

  while ((statusMatch = statusRegex.exec(cleanScript)) !== null) {
    const code = statusMatch[1]
    if (!seenStatusCodes.has(code)) {
      seenStatusCodes.add(code)
      generatedNodes.push(
        createNode('ResponseAssertion', `Status Code is ${code}`, {
          field: 'response-code',
          matchType: 'equals',
          patterns: [{ pattern: code }],
        }),
      )
    }
  }

  // 2. Substring / Body assertions: pm.expect(pm.response.text()).to.include("xyz"), responseBody.has("xyz")
  const bodyTextRegex = /(?:pm\.expect\(pm\.response\.text\(\)\)\.to\.(?:include|contain)|pm\.response\.text\(\)\.has|responseBody\.has)\s*\(\s*["']([^"']+)["']\s*\)/g
  let bodyMatch: RegExpExecArray | null
  const seenPatterns = new Set<string>()

  while ((bodyMatch = bodyTextRegex.exec(cleanScript)) !== null) {
    const pattern = bodyMatch[1]
    if (!seenPatterns.has(pattern)) {
      seenPatterns.add(pattern)
      const label = pattern.length > 25 ? `${pattern.slice(0, 25)}...` : pattern
      generatedNodes.push(
        createNode('ResponseAssertion', `Response contains "${label}"`, {
          field: 'response-data',
          matchType: 'substring',
          patterns: [{ pattern }],
        }),
      )
    }
  }

  // 3. JSON extractors: pm.environment.set("token", jsonData.token) or jsonData.data.id
  const jsonExtractRegex = /pm\.(?:environment|collectionVariables|globals)\.set\s*\(\s*["']([^"']+)["']\s*,\s*jsonData\.([a-zA-Z0-9_.$[\]]+)\s*\)/g
  let extractMatch: RegExpExecArray | null
  const seenVars = new Set<string>()

  while ((extractMatch = jsonExtractRegex.exec(cleanScript)) !== null) {
    const varName = extractMatch[1]
    const jsonPath = extractMatch[2].startsWith('$') ? extractMatch[2] : `$.${extractMatch[2]}`
    if (!seenVars.has(varName)) {
      seenVars.add(varName)
      generatedNodes.push(
        createNode('JSONExtractor', `Extract ${varName}`, {
          variableNames: varName,
          jsonPaths: jsonPath,
          matchNumbers: '1',
          defaults: 'NOT_FOUND',
        }),
      )
    }
  }

  // 4. Fallback: if no assertions extracted or script has complex logic, add a Groovy stub
  if (generatedNodes.length === 0 && cleanScript.includes('pm.')) {
    generatedNodes.push(
      createNode('JSR223PostProcessor', `Postman Script Stub (${requestName})`, {
        scriptLanguage: 'groovy',
        script: `// Transpiled Postman script stub (manual review recommended):\n/*\n${cleanScript}\n*/`,
      }),
    )
  }

  return generatedNodes
}
