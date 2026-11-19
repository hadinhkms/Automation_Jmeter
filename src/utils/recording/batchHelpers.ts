import type { RecordedRequest, RecordedCookie } from '../../models/recorder'
import type { TableRow, TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'
import type { ConversionOptions } from '../../models/recording'

/**
 * Extract primary domain (most frequent server) and its protocol.
 */
export function detectPrimaryDomain(requests: RecordedRequest[]): {
  primaryDomain: string | undefined
  primaryProtocol: string
} {
  const domainCounts = new Map<string, number>()
  for (const r of requests) {
    if (r.server) {
      domainCounts.set(r.server, (domainCounts.get(r.server) || 0) + 1)
    }
  }
  let primaryDomain: string | undefined
  let maxCount = 0
  for (const [dom, count] of domainCounts.entries()) {
    if (count > maxCount) {
      maxCount = count
      primaryDomain = dom
    }
  }

  const primaryProtocol = requests.find((r) => r.server === primaryDomain)?.protocol || 'https'

  return { primaryDomain, primaryProtocol }
}

/**
 * Create Cookie Manager if requested, placed right after Defaults or at index 0.
 */
export function insertCookieManager(
  nodes: TestPlanNode[],
  allCookies: RecordedCookie[],
  options: ConversionOptions,
): void {
  let cookieManagerNode: TestPlanNode | undefined

  if (options.createCookieManager && allCookies.length > 0) {
    const uniqueCookiesMap = new Map<string, RecordedCookie>()
    for (const c of allCookies) {
      uniqueCookiesMap.set(`${c.domain || ''}_${c.name}`, c)
    }
    const cookieRows: TableRow[] = Array.from(uniqueCookiesMap.values()).map((c) => ({
      name: c.name,
      value: options.parameterizeSecrets ? `\${${c.name.toUpperCase()}}` : c.value,
      domain: c.domain || '',
      path: c.path || '',
      secure: Boolean(c.secure),
      expires: c.expires || '',
    }))

    cookieManagerNode = createNode('HTTPCookieManager', 'HTTP Cookie Manager', {
      clearEachIteration: false,
      controlledByThreadGroup: false,
      cookies: cookieRows,
    })

    // Place Cookie Manager right after Defaults or at index 0
    const insertIdx = nodes.findIndex((n) => n.type === 'HTTPRequestDefaults')
    if (insertIdx !== -1) {
      nodes.splice(insertIdx + 1, 0, cookieManagerNode)
    } else {
      nodes.unshift(cookieManagerNode)
    }
  }
}

/**
 * Prepend UserDefinedVariables if variables were extracted.
 */
export function prependUserDefinedVariables(
  nodes: TestPlanNode[],
  globalVariables: Record<string, string>,
  options: ConversionOptions,
): void {
  if (options.parameterizeSecrets && Object.keys(globalVariables).length > 0) {
    const varRows: TableRow[] = Object.entries(globalVariables).map(([k, v]) => ({
      name: k,
      value: v,
      description: `Auto-extracted from recorded requests`,
    }))

    const udvNode = createNode('UserDefinedVariables', 'User Defined Variables', {
      variables: varRows,
    })
    nodes.unshift(udvNode)
  }
}
