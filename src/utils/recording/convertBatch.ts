import type { RecordedRequest, RecordedCookie } from '../../models/recorder'
import type { TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'
import type { ConversionOptions } from '../../models/recording'
import { convertRecordToSampler } from './convertSampler'
import { detectPrimaryDomain, insertCookieManager, prependUserDefinedVariables } from './batchHelpers'

/**
 * Convert a batch of recorded requests into a list of JMeter nodes.
 */
export function convertRecordedRequestsToNodes(
  requests: RecordedRequest[],
  options: ConversionOptions = {},
): {
  nodes: TestPlanNode[]
  totalSamplers: number
  primaryDomain?: string
  extractedVariables: Record<string, string>
} {
  if (requests.length === 0) {
    return { nodes: [], totalSamplers: 0, extractedVariables: {} }
  }

  const nodes: TestPlanNode[] = []
  let samplerCounter = 0
  const globalVariables: Record<string, string> = {}
  const allCookies: RecordedCookie[] = []

  // Extract primary domain and protocol
  const { primaryDomain, primaryProtocol } = detectPrimaryDomain(requests)

  // 1. Optional: User Defined Variables (if parameterizing secrets)
  // We'll populate variables as we traverse samplers, then insert UDV at top

  // 2. Optional: HTTP Request Defaults
  if (options.createDefaults && primaryDomain) {
    const defaultsNode = createNode('HTTPRequestDefaults', 'HTTP Request Defaults', {
      protocol: primaryProtocol,
      server: primaryDomain,
      port: '',
      contentEncoding: 'UTF-8',
      responseTimeout: '',
      connectTimeout: '',
    })
    nodes.push(defaultsNode)
  }

  // 3. Optional: HTTP Cookie Manager
  if (options.groupByTransaction) {
    // Group requests by transaction name while preserving original appearance order
    const transactionOrder: string[] = []
    const grouped = new Map<string, RecordedRequest[]>()

    for (const req of requests) {
      const tx = req.transaction || 'Recorded Steps'
      if (!grouped.has(tx)) {
        grouped.set(tx, [])
        transactionOrder.push(tx)
      }
      grouped.get(tx)!.push(req)
    }

    for (const txName of transactionOrder) {
      const txRequests = grouped.get(txName) || []
      const txNode = createNode('TransactionController', txName, {
        generateParent: true,
        includeTimers: false,
      })

      for (const req of txRequests) {
        const { samplerNode, cookies } = convertRecordToSampler(
          req,
          samplerCounter++,
          options,
          options.createDefaults ? primaryDomain : undefined,
          options.createDefaults ? primaryProtocol : undefined,
          globalVariables,
        )
        txNode.children.push(samplerNode)
        allCookies.push(...cookies)
      }

      nodes.push(txNode)
    }
  } else {
    // Flat list of samplers
    for (const req of requests) {
      const { samplerNode, cookies } = convertRecordToSampler(
        req,
        samplerCounter++,
        options,
        options.createDefaults ? primaryDomain : undefined,
        options.createDefaults ? primaryProtocol : undefined,
        globalVariables,
      )
      nodes.push(samplerNode)
      allCookies.push(...cookies)
    }
  }

  // 4. Create Cookie Manager if requested
  insertCookieManager(nodes, allCookies, options)

  // 5. Prepend UserDefinedVariables if variables were extracted
  prependUserDefinedVariables(nodes, globalVariables, options)

  return {
    nodes,
    totalSamplers: samplerCounter,
    primaryDomain,
    extractedVariables: globalVariables,
  }
}
