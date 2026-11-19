import type { TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'
import type { ParsedCurl } from '../../models/curl'

/**
 * Convert a ParsedCurl object into a JMeter HTTPRequest TestPlanNode (with optional child HTTPHeaderManager).
 */
export function convertCurlToNodes(
  parsed: ParsedCurl,
  customName?: string,
  includeHeaderManager = true,
  includeCookieManager = false,
): { samplerNode: TestPlanNode; headerNode?: TestPlanNode; cookieNode?: TestPlanNode } {
  const samplerName = customName?.trim() || parsed.suggestedName

  const samplerNode = createNode('HTTPRequest', samplerName, {
    method: parsed.method || 'GET',
    protocol: parsed.protocol || 'https',
    server: parsed.server || '',
    port: parsed.port || '',
    path: parsed.path || '/',
    contentEncoding: 'UTF-8',
    followRedirects: true,
    autoRedirects: false,
    keepAlive: true,
    multipart: false,
    browserCompatible: false,
    postBodyRaw: parsed.isRawBody,
    body: parsed.body,
    parameters: parsed.isRawBody ? [] : parsed.parameters,
    files: [],
  })

  let headerNode: TestPlanNode | undefined
  if (includeHeaderManager && parsed.headers.length > 0) {
    headerNode = createNode('HTTPHeaderManager', 'HTTP Header Manager', {
      headers: parsed.headers,
    })
    samplerNode.children.push(headerNode)
  }

  let cookieNode: TestPlanNode | undefined
  if (includeCookieManager && parsed.cookies.length > 0) {
    cookieNode = createNode('HTTPCookieManager', 'HTTP Cookie Manager', {
      cookies: parsed.cookies,
      clearEachIteration: false,
      controlledByThreadGroup: false,
    })
    samplerNode.children.push(cookieNode)
  }

  return { samplerNode, headerNode, cookieNode }
}
