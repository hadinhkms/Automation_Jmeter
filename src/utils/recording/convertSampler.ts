import type { RecordedRequest, RecordedCookie } from '../../models/recorder'
import type { TableRow, TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'
import { redactHeaders, redactParams } from '../redaction/redactFields'
import type { ConversionOptions } from '../../models/recording'
import { filterRecordedHeaders } from './urlFilters'
import { extractQueryParamsAndPath } from './params'
import { formatSamplerName } from './samplerName'
import { buildSamplerBody } from './samplerBody'

/**
 * Convert a single RecordedRequest into an HTTPRequest TestPlanNode.
 */
export function convertRecordToSampler(
  req: RecordedRequest,
  index: number,
  options: ConversionOptions = {},
  defaultsDomain?: string,
  defaultsProtocol?: string,
  globalVariablesCollector?: Record<string, string>,
): { samplerNode: TestPlanNode; cookies: RecordedCookie[] } {
  const redactionMode = options.parameterizeSecrets
    ? 'parameterize'
    : options.maskSensitive
    ? 'mask'
    : 'none'

  // 1. Process and Redact Headers
  const rawHeaders = options.cleanRedundantHeaders !== false
    ? filterRecordedHeaders(req.requestHeaders)
    : req.requestHeaders

  const { headers: processedHeaders, extractedVariables: headerVars } = redactHeaders(
    rawHeaders,
    redactionMode,
  )
  if (globalVariablesCollector) {
    Object.assign(globalVariablesCollector, headerVars)
  }

  // 2. Query Parameters & Clean Path
  const { cleanPath, queryParams: extractedQueryParams } = extractQueryParamsAndPath(req.url || req.path || '/')
  const queryParams = req.queryParams && req.queryParams.length > 0 ? req.queryParams : extractedQueryParams

  const { params: processedQueryParams, extractedVariables: queryVars } = redactParams(
    queryParams,
    redactionMode,
  )
  if (globalVariablesCollector) {
    Object.assign(globalVariablesCollector, queryVars)
  }

  // 3. Request Body / Form Params / Multipart Processing
  const { isMultipart, postBodyRaw, bodyContent, finalParameters, filesList } = buildSamplerBody(
    req,
    redactionMode,
    processedQueryParams,
    globalVariablesCollector,
  )

  // 4. Server & Protocol Inheritance from HTTPRequestDefaults
  let samplerServer = req.server || ''
  let samplerProtocol = req.protocol || 'https'

  if (defaultsDomain && defaultsProtocol && samplerServer === defaultsDomain && samplerProtocol === defaultsProtocol) {
    samplerServer = ''
    samplerProtocol = ''
  }

  // 5. Create Sampler Node
  const samplerName = formatSamplerName(req, index, options.customNaming)

  const samplerNode = createNode('HTTPRequest', samplerName, {
    method: req.method || 'GET',
    protocol: samplerProtocol,
    server: samplerServer,
    port: req.port || '',
    path: cleanPath || '/',
    contentEncoding: 'UTF-8',
    followRedirects: true,
    autoRedirects: false,
    keepAlive: true,
    multipart: isMultipart,
    browserCompatible: isMultipart,
    postBodyRaw,
    body: bodyContent,
    parameters: finalParameters,
    files: filesList,
  })

  // 6. Child Header Manager
  if (options.createHeaderManager !== false && processedHeaders.length > 0) {
    const headerRows: TableRow[] = processedHeaders.map((h) => ({
      name: h.name,
      value: h.value,
    }))
    const headerNode = createNode('HTTPHeaderManager', 'HTTP Header Manager', {
      headers: headerRows,
    })
    samplerNode.children.push(headerNode)
  }

  return {
    samplerNode,
    cookies: req.cookies || [],
  }
}
