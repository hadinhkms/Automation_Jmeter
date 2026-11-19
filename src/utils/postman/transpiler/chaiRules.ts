import type { TestPlanNode } from '../../../models/jmeter'
import { createNode } from '../../../mock/sampleTestPlan'

/** One translation rule: a global regex plus a factory; `key` de-duplicates repeated matches. */
export interface ChaiRule {
  regex: RegExp
  build: (m: RegExpExecArray) => { key: string; node: TestPlanNode } | null
}

const JSON_SOURCE = String.raw`(?:jsonData|res|data|body|response|pm\.response\.json\(\))`
const JSON_PATH = String.raw`((?:\.[A-Za-z_$][\w$]*|\[\d+\]|\[["'][^"']+["']\])+)`
const LITERAL = String.raw`("[^"]*"|'[^']*'|-?\d+(?:\.\d+)?|true|false|null)`

/** `.a.b[0]["c d"]` -> `$.a.b[0]['c d']` */
export function toJsonPath(accessor: string): string {
  return `$${accessor.replace(/\[["']([^"']+)["']\]/g, "['$1']")}`
}

function unquote(literal: string): string {
  return /^["']/.test(literal) ? literal.slice(1, -1) : literal
}

/** Expected value as JMeter compares it: strings unquoted, numbers canonical (`10.50` -> `10.5`, like JSON serialisation). */
function expectedText(literal: string): string {
  return /^-?\d/.test(literal) ? String(Number(literal)) : unquote(literal)
}

export const CHAI_RULES: ChaiRule[] = [
  // pm.response.to.have.status(200) | pm.expect(pm.response.code).to.eq(200) | responseCode.code === 200
  {
    regex: /(?:pm\.response\.to\.(?:have|be)\.status|pm\.expect\(pm\.response\.code\)\.to\.(?:eq|equal|eql)|responseCode\.code\s*===?)\s*\(?\s*["']?(\d{3})(?!\d)["']?\s*\)?/g,
    build: (m) => ({
      key: `status:${m[1]}`,
      node: createNode('ResponseAssertion', `Status Code is ${m[1]}`, { field: 'response-code', matchType: 'equals', patterns: [{ pattern: m[1] }] }),
    }),
  },
  // pm.expect(pm.response.text()).to.include("x") | responseBody.has("x")
  {
    regex: /(?:pm\.expect\(pm\.response\.text\(\)\)\.to\.(?:include|contain)|pm\.response\.text\(\)\.has|responseBody\.has)\s*\(\s*["']([^"']+)["']\s*\)/g,
    build: (m) => {
      const label = m[1].length > 25 ? `${m[1].slice(0, 25)}...` : m[1]
      return {
        key: `body:${m[1]}`,
        node: createNode('ResponseAssertion', `Response contains "${label}"`, { field: 'response-data', matchType: 'substring', patterns: [{ pattern: m[1] }] }),
      }
    },
  },
  // pm.environment.set("token", jsonData.token)
  {
    regex: new RegExp(String.raw`pm\.(?:environment|collectionVariables|globals|variables)\.set\s*\(\s*["']([^"']+)["']\s*,\s*${JSON_SOURCE}${JSON_PATH}\s*\)`, 'g'),
    build: (m) => ({
      key: `extract:${m[1]}=${m[2]}`,
      node: createNode('JSONExtractor', `Extract ${m[1]}`, { variableNames: m[1], jsonPaths: toJsonPath(m[2]), matchNumbers: '1', defaults: 'NOT_FOUND' }),
    }),
  },
  // pm.expect(jsonData.a.b).to.eql("x") | .to.equal(1) | .to.eq(true)
  {
    regex: new RegExp(String.raw`pm\.expect\(\s*${JSON_SOURCE}${JSON_PATH}\s*\)\.to\.(?:be\.)?(?:eql|equal|eq)\s*\(\s*${LITERAL}\s*\)`, 'g'),
    build: (m) => {
      const path = toJsonPath(m[1])
      const expectNull = m[2] === 'null'
      const expected = expectedText(m[2])
      return {
        key: `jsonEq:${path}=${expected}`,
        node: createNode('JSONPathAssertion', `${path} equals ${expected}`, {
          jsonPath: path, expectedValue: expectNull ? '' : expected, jsonValidation: !expectNull, expectNull, invert: false, isRegex: false,
        }),
      }
    },
  },
  // pm.expect(jsonData.a).to.exist | pm.expect(jsonData).to.have.property("a")
  {
    regex: new RegExp(String.raw`pm\.expect\(\s*${JSON_SOURCE}(?:${JSON_PATH}\s*\)\.to\.(?:exist|not\.be\.undefined)|\s*\)\.to\.have\.property\(\s*["']([^"']+)["']\s*\))`, 'g'),
    build: (m) => {
      const path = m[1] ? toJsonPath(m[1]) : `$.${m[2]}`
      return {
        key: `jsonExists:${path}`,
        node: createNode('JSONPathAssertion', `${path} exists`, { jsonPath: path, expectedValue: '', jsonValidation: false, expectNull: false, invert: false, isRegex: false }),
      }
    },
  },
  // pm.response.to.have.header("Content-Type") | .header("Content-Type", "application/json")
  {
    regex: /pm\.response\.to\.have\.header\s*\(\s*["']([^"']+)["']\s*(?:,\s*["']([^"']*)["']\s*)?\)/g,
    build: (m) => {
      const pattern = m[2] === undefined ? `${m[1]}:` : `${m[1]}: ${m[2]}`
      const name = m[2] === undefined ? `Has header ${m[1]}` : `Header ${m[1]} is ${m[2]}`
      return {
        key: `header:${m[1].toLowerCase()}:${m[2] ?? ''}`,
        node: createNode('ResponseAssertion', name, { field: 'response-headers', matchType: 'substring', patterns: [{ pattern }] }),
      }
    },
  },
  // pm.expect(pm.response.responseTime).to.be.below(500)
  {
    regex: /pm\.expect\(\s*pm\.response\.responseTime\s*\)\.to\.be\.(?:below|lessThan|lt|at\.most)\s*\(\s*(\d+)\s*\)/g,
    build: (m) => ({
      key: `duration:${m[1]}`,
      node: createNode('JSR223Assertion', `Response time below ${m[1]} ms`, {
        language: 'groovy',
        script: `// Transpiled from pm.expect(pm.response.responseTime).to.be.below(${m[1]})\nif (prev.getTime() >= ${m[1]}) {\n  AssertionResult.setFailure(true)\n  AssertionResult.setFailureMessage("Response time " + prev.getTime() + " ms is not below ${m[1]} ms")\n}`,
      }),
    }),
  },
]
