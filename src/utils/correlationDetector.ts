// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import type { RecordedRequest } from '../models/recorder'
import type { TableRow, TestPlanNode } from '../models/jmeter'
import { createNode } from '../mock/sampleTestPlan'

export interface CorrelationTarget {
  targetRequestId: string
  targetRequestName: string
  location: 'header' | 'param' | 'body' | 'url'
  field?: string
  originalValue: string
  replacementExpression: string
}

export interface CorrelationCandidate {
  id: string
  variableName: string
  sourceRequestId: string
  sourceRequestName: string
  extractorType: 'JSONExtractor' | 'RegexExtractor'
  jsonPath?: string
  regex?: string
  sampleValue: string
  confidence: 'HIGH' | 'MEDIUM'
  targets: CorrelationTarget[]
  enabled: boolean
}

const TOKEN_KEY_PATTERNS = [
  /token/i,
  /jwt/i,
  /access_?token/i,
  /id_?token/i,
  /auth/i,
  /session_?id/i,
  /csrf/i,
  /xsrf/i,
  /ticket/i,
  /order_?id/i,
  /user_?id/i,
  /account_?id/i,
]

function sanitizeVariableName(key: string): string {
  return key
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toUpperCase()
    .replace(/^_+|_+$/g, '') || 'DYNAMIC_VAR'
}

/**
 * Traverses JSON object recursively to extract key-value pairs with their JSONPath
 */
function extractJsonFields(
  obj: unknown,
  currentPath = '$',
  results: Array<{ path: string; key: string; value: string }> = [],
): Array<{ path: string; key: string; value: string }> {
  if (obj === null || obj === undefined) return results

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    const strVal = String(obj).trim()
    if (strVal.length >= 6 && strVal.length <= 1024 && !['true', 'false', 'null', 'undefined'].includes(strVal)) {
      const pathSegments = currentPath.split('.')
      const lastKey = pathSegments[pathSegments.length - 1] || 'val'
      results.push({ path: currentPath, key: lastKey, value: strVal })
    }
    return results
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      extractJsonFields(item, `${currentPath}[${index}]`, results)
    })
    return results
  }

  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      extractJsonFields(v, `${currentPath}.${k}`, results)
    }
  }

  return results
}

/**
 * Detects dynamic token and session candidates across recorded requests
 */
export function detectCorrelations(requests: RecordedRequest[]): CorrelationCandidate[] {
  const candidates: CorrelationCandidate[] = []
  const seenValues = new Set<string>()

  for (let i = 0; i < requests.length; i++) {
    const source = requests[i]
    if (!source.responseBody && (!source.responseHeaders || source.responseHeaders.length === 0)) {
      continue
    }

    const discoveredInSource: Array<{
      key: string
      value: string
      jsonPath?: string
      regex?: string
      extractorType: 'JSONExtractor' | 'RegexExtractor'
      isHighConfidence: boolean
    }> = []

    // 1. Check JSON Response Body
    if (source.responseBody) {
      try {
        const parsedJson = JSON.parse(source.responseBody)
        const fields = extractJsonFields(parsedJson)

        for (const field of fields) {
          const isKeyInteresting = TOKEN_KEY_PATTERNS.some((p) => p.test(field.key))
          const isValJwt = field.value.startsWith('ey') && field.value.split('.').length === 3
          const isHigh = isKeyInteresting || isValJwt

          discoveredInSource.push({
            key: field.key,
            value: field.value,
            jsonPath: field.path,
            extractorType: 'JSONExtractor',
            isHighConfidence: isHigh,
          })
        }
      } catch {
        // Not valid JSON, search for token patterns via Regex
        for (const pattern of TOKEN_KEY_PATTERNS) {
          const regexStr = `["']?(${pattern.source})["']?\\s*[:=]\\s*["']([^"']{8,512})["']`
          const regex = new RegExp(regexStr, 'i')
          const match = source.responseBody.match(regex)
          if (match && match[2]) {
            discoveredInSource.push({
              key: match[1],
              value: match[2],
              regex: `"${match[1]}":"([^"]+)"`,
              extractorType: 'RegexExtractor',
              isHighConfidence: true,
            })
          }
        }
      }
    }

    // 2. Scan subsequent requests (j > i) to see if these values are used
    for (const discovered of discoveredInSource) {
      if (seenValues.has(discovered.value)) continue

      const matchingTargets: CorrelationTarget[] = []

      for (let j = i + 1; j < requests.length; j++) {
        const target = requests[j]
        const targetName = target.transaction ? `[${target.transaction}] ${target.method} ${target.url}` : `${target.method} ${target.url}`

        // A. Check in Headers
        if (target.requestHeaders) {
          for (const h of target.requestHeaders) {
            if (h.value.includes(discovered.value)) {
              matchingTargets.push({
                targetRequestId: target.id,
                targetRequestName: targetName,
                location: 'header',
                field: h.name,
                originalValue: discovered.value,
                replacementExpression: `\${${sanitizeVariableName(discovered.key)}}`,
              })
            }
          }
        }

        // B. Check in Post Body
        if (target.postData && target.postData.includes(discovered.value)) {
          matchingTargets.push({
            targetRequestId: target.id,
            targetRequestName: targetName,
            location: 'body',
            originalValue: discovered.value,
            replacementExpression: `\${${sanitizeVariableName(discovered.key)}}`,
          })
        }

        // C. Check in Query Params / URL
        if (target.url.includes(discovered.value)) {
          matchingTargets.push({
            targetRequestId: target.id,
            targetRequestName: targetName,
            location: 'url',
            originalValue: discovered.value,
            replacementExpression: `\${${sanitizeVariableName(discovered.key)}}`,
          })
        }
      }

      if (matchingTargets.length > 0) {
        seenValues.add(discovered.value)
        const varName = sanitizeVariableName(discovered.key)

        candidates.push({
          id: `corr_${candidates.length + 1}_${Date.now()}`,
          variableName: varName,
          sourceRequestId: source.id,
          sourceRequestName: source.transaction ? `[${source.transaction}] ${source.method} ${source.url}` : `${source.method} ${source.url}`,
          extractorType: discovered.extractorType,
          jsonPath: discovered.jsonPath,
          regex: discovered.regex,
          sampleValue: discovered.value.length > 60 ? `${discovered.value.slice(0, 57)}...` : discovered.value,
          confidence: discovered.isHighConfidence ? 'HIGH' : 'MEDIUM',
          targets: matchingTargets,
          enabled: true,
        })
      }
    }
  }

  return candidates
}

/**
 * Injects extractors and replaces parameter references inside a TestPlanNode hierarchy
 */
export function applyCorrelationsToTree(
  rootNode: TestPlanNode,
  correlations: CorrelationCandidate[],
): TestPlanNode {
  const activeCorrs = correlations.filter((c) => c.enabled)
  if (activeCorrs.length === 0) return rootNode

  const clone: TestPlanNode = JSON.parse(JSON.stringify(rootNode))

  // Map of replacements by original value
  const replacementsByVal = new Map<string, string>()
  activeCorrs.forEach((c) => {
    replacementsByVal.set(c.sampleValue, `\${${c.variableName}}`)
    c.targets.forEach((t) => {
      replacementsByVal.set(t.originalValue, `\${${c.variableName}}`)
    })
  })

  function replaceInString(str: string): string {
    if (!str) return str
    let res = str
    replacementsByVal.forEach((replacement, orig) => {
      if (orig && res.includes(orig)) {
        res = res.replaceAll(orig, replacement)
      }
    })
    return res
  }

  function traverseAndPatch(node: TestPlanNode) {
    // 1. If this node is a source request, attach the Extractor child
    const matchingSources = activeCorrs.filter((c) => {
      const nodeName = node.name.toLowerCase()
      const srcUrl = c.sourceRequestName.toLowerCase()
      return nodeName.includes(srcUrl.slice(-30)) || node.id === c.sourceRequestId
    })

    for (const src of matchingSources) {
      if (src.extractorType === 'JSONExtractor' && src.jsonPath) {
        const extractorNode = createNode('JSONExtractor', `${src.variableName} Extractor`, {
          variableNames: src.variableName,
          jsonPathExprs: src.jsonPath,
          matchNumbers: '1',
          defaultValues: 'NOT_FOUND',
        })
        node.children.push(extractorNode)
      } else if (src.regex) {
        const regexNode = createNode('RegexExtractor', `${src.variableName} Extractor`, {
          refName: src.variableName,
          regex: src.regex,
          template: '$1$',
          matchNumber: '1',
          defaultVal: 'NOT_FOUND',
        })
        node.children.push(regexNode)
      }
    }

    // 2. Perform parameter replacement in properties
    if (node.properties) {
      if (typeof node.properties.path === 'string') {
        node.properties.path = replaceInString(node.properties.path)
      }
      if (typeof node.properties.postBody === 'string') {
        node.properties.postBody = replaceInString(node.properties.postBody)
      }
      if (typeof node.properties.rawBody === 'string') {
        node.properties.rawBody = replaceInString(node.properties.rawBody)
      }

      if (Array.isArray(node.properties.parameters)) {
        node.properties.parameters = (node.properties.parameters as TableRow[]).map((param) => ({
          ...param,
          value: replaceInString(String(param.value ?? '')),
        }))
      }

      if (Array.isArray(node.properties.headers)) {
        node.properties.headers = (node.properties.headers as TableRow[]).map((header) => ({
          ...header,
          value: replaceInString(String(header.value ?? '')),
        }))
      }
    }

    node.children.forEach(traverseAndPatch)
  }

  traverseAndPatch(clone)
  return clone
}
