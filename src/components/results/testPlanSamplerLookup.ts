import type { TestPlanNode } from '../../models/jmeter'

export interface TestPlanSamplerRequest {
  method: string
  body: string
}

interface SamplerParameter {
  name?: string
  value?: string
  encode?: boolean
}

function findHttpSamplerNode(testPlan: TestPlanNode, sampleLabel: string): TestPlanNode | null {
  const target = sampleLabel.trim().toLowerCase()
  let fuzzyMatch: TestPlanNode | null = null

  // Exact label match wins; fuzzy (contains) match is only a fallback, so "TC007" never shadows "TC007b".
  function traverse(node: TestPlanNode): TestPlanNode | null {
    if (node.type === 'HTTPRequest') {
      const name = node.name.trim().toLowerCase()
      if (name === target) return node
      if (!fuzzyMatch && name && (target.includes(name) || name.includes(target))) fuzzyMatch = node
    }
    for (const child of node.children || []) {
      const found = traverse(child)
      if (found) return found
    }
    return null
  }

  return traverse(testPlan) || fuzzyMatch
}

function encodeFormParameters(parameters: SamplerParameter[]): string {
  return parameters
    .filter((p) => p.name)
    .map((p) => {
      const name = String(p.name)
      const value = String(p.value ?? '')
      return p.encode ? `${encodeURIComponent(name)}=${encodeURIComponent(value)}` : `${name}=${value}`
    })
    .join('&')
}

/**
 * CSV JTL files carry no samplerData, so the request body is lost in results.
 * Recover the configured method/body from the matching HTTP Request sampler in the loaded test plan.
 */
export function findSamplerRequestInTestPlan(
  testPlan: TestPlanNode | null | undefined,
  sampleLabel: string
): TestPlanSamplerRequest | null {
  if (!testPlan) return null
  const node = findHttpSamplerNode(testPlan, sampleLabel)
  if (!node) return null

  const props = node.properties || {}
  const method = String(props.method || '').toUpperCase()
  let body = ''
  if (props.postBodyRaw) {
    body = String(props.body ?? '')
  } else if (method !== 'GET' && Array.isArray(props.parameters)) {
    body = encodeFormParameters(props.parameters as SamplerParameter[])
  }

  return { method, body: body.trim() }
}

export function findSamplerHeadersInTestPlan(
  testPlan: TestPlanNode | null | undefined,
  sampleLabel: string
): { name: string; value: string }[] {
  if (!testPlan) return []

  const foundHeaders: { name: string; value: string }[] = []

  function traverse(node: TestPlanNode, inheritedHeaders: { name: string; value: string }[]): boolean {
    const scopeHeaders = [...inheritedHeaders]
    for (const child of node.children || []) {
      if (child.type === 'HTTPHeaderManager' && child.enabled) {
        const hdrs = (child.properties.headers as { name: string; value: string }[]) || []
        for (const h of hdrs) {
          if (h.name && h.value) {
            const idx = scopeHeaders.findIndex((sh) => sh.name.toLowerCase() === h.name.toLowerCase())
            if (idx >= 0) scopeHeaders[idx] = h
            else scopeHeaders.push(h)
          }
        }
      }
    }

    const cleanNodeName = node.name.trim().toLowerCase()
    const cleanSampleLabel = sampleLabel.trim().toLowerCase()
    const isMatch =
      cleanNodeName === cleanSampleLabel ||
      (node.type === 'HTTPRequest' && (cleanSampleLabel.includes(cleanNodeName) || cleanNodeName.includes(cleanSampleLabel)))

    if (isMatch) {
      for (const h of scopeHeaders) {
        if (!foundHeaders.some((fh) => fh.name.toLowerCase() === h.name.toLowerCase())) {
          foundHeaders.push(h)
        }
      }
      return true
    }

    for (const child of node.children || []) {
      if (traverse(child, scopeHeaders)) return true
    }
    return false
  }

  traverse(testPlan, [])
  return foundHeaders
}
