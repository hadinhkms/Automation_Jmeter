import type { RecordedRequest, RecordedHeader, RecordedParam, RecordedCookie } from '../models/recorder'
import type { TableRow, TestPlanNode } from '../models/jmeter'
import { createNode } from '../mock/sampleTestPlan'
import {
  redactHeaders,
  redactParams,
  redactBodyContent,
} from './redactionUtils'

export const STATIC_EXTENSIONS = new Set([
  'css',
  'js',
  'mjs',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'ico',
  'webp',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'otf',
  'map',
  'mp4',
  'webm',
  'mp3',
])

export const ANALYTICS_DOMAINS = [
  'google-analytics.com',
  'analytics.google.com',
  'googletagmanager.com',
  'doubleclick.net',
  'clarity.ms',
  'facebook.net',
  'facebook.com/tr',
  'hotjar.com',
  'segment.io',
  'sentry.io',
  'browser-intake-datadoghq.com',
  'newrelic.com',
]

export const REDUNDANT_HEADERS = new Set([
  'host',
  'content-length',
  'connection',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-dest',
  'sec-fetch-user',
  ':authority',
  ':method',
  ':path',
  ':scheme',
])

export interface ConversionOptions {
  groupByTransaction?: boolean
  createHeaderManager?: boolean
  createCookieManager?: boolean
  createDefaults?: boolean
  cleanRedundantHeaders?: boolean
  maskSensitive?: boolean
  parameterizeSecrets?: boolean
  customNaming?: 'method-path' | 'path-only' | 'index-method-path'
}

/**
 * Checks if a URL points to a static resource (images, css, fonts, maps, etc.)
 */
export function isStaticUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    const pathname = u.pathname.toLowerCase()
    const dotIdx = pathname.lastIndexOf('.')
    if (dotIdx !== -1) {
      const ext = pathname.slice(dotIdx + 1)
      if (STATIC_EXTENSIONS.has(ext)) return true
    }
  } catch {
    return false
  }
  return false
}

/**
 * Checks if a URL belongs to known tracking/analytics domains.
 */
export function isAnalyticsUrl(urlStr: string): boolean {
  const lower = urlStr.toLowerCase()
  return ANALYTICS_DOMAINS.some((d) => lower.includes(d))
}

/**
 * Cleans request headers, stripping redundant browser-internal headers.
 */
export function filterRecordedHeaders(headers: RecordedHeader[]): RecordedHeader[] {
  const result: RecordedHeader[] = []
  for (const h of headers) {
    const nameLower = h.name.toLowerCase()
    if (!REDUNDANT_HEADERS.has(nameLower)) {
      result.push({
        name: h.name,
        value: h.value,
      })
    }
  }
  return result
}

/**
 * Extracts query parameters from a URL and returns clean pathname.
 */
export function extractQueryParamsAndPath(urlStr: string): {
  cleanPath: string
  queryParams: RecordedParam[]
} {
  try {
    let toParse = urlStr
    if (!/^https?:\/\//i.test(toParse)) toParse = `https://${toParse}`
    const u = new URL(toParse)
    const params: RecordedParam[] = []
    u.searchParams.forEach((val, key) => {
      params.push({ name: key, value: val, encode: true })
    })
    const cleanPath = u.pathname || '/'
    return { cleanPath, queryParams: params }
  } catch {
    const qIdx = urlStr.indexOf('?')
    if (qIdx !== -1) {
      const cleanPath = urlStr.slice(0, qIdx) || '/'
      const qStr = urlStr.slice(qIdx + 1)
      const params: RecordedParam[] = []
      const pairs = qStr.split('&')
      for (const pair of pairs) {
        const [k, v] = pair.split('=')
        if (k) {
          params.push({
            name: decodeURIComponent(k),
            value: v ? decodeURIComponent(v) : '',
            encode: true,
          })
        }
      }
      return { cleanPath, queryParams: params }
    }
    return { cleanPath: urlStr || '/', queryParams: [] }
  }
}

/**
 * Formats a clean name for an HTTP sampler.
 */
export function formatSamplerName(
  req: RecordedRequest,
  index: number,
  naming: ConversionOptions['customNaming'] = 'index-method-path',
): string {
  const cleanPath = (req.path || '').split('?')[0] || '/'
  const truncatedPath = cleanPath.length > 40 ? cleanPath.slice(0, 37) + '...' : cleanPath

  if (naming === 'path-only') {
    return truncatedPath
  }
  if (naming === 'method-path') {
    return `${req.method} ${truncatedPath}`
  }
  return `${index + 1}.0 ${req.method} ${truncatedPath}`
}

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
  const contentType = (
    req.requestHeaders.find((h) => h.name.toLowerCase() === 'content-type')?.value ||
    req.mimeType ||
    ''
  ).toLowerCase()

  const isFormUrlEncoded =
    contentType.includes('application/x-www-form-urlencoded') ||
    (req.postParams && req.postParams.length > 0 && !contentType.includes('json') && !contentType.includes('multipart'))
  const isMultipart = contentType.includes('multipart/form-data') || (req.files && req.files.length > 0)

  let postBodyRaw = false
  let bodyContent = ''
  const finalParameters: TableRow[] = []
  const filesList: TableRow[] = []

  if (isFormUrlEncoded) {
    // URL-encoded form parameters
    postBodyRaw = false
    bodyContent = ''

    const formParams: RecordedParam[] = req.postParams && req.postParams.length > 0 ? [...req.postParams] : []
    if (formParams.length === 0 && req.postData) {
      const pairs = req.postData.split('&')
      for (const p of pairs) {
        const [k, v] = p.split('=')
        if (k) {
          formParams.push({
            name: decodeURIComponent(k),
            value: v ? decodeURIComponent(v) : '',
            encode: true,
          })
        }
      }
    }

    const { params: processedFormParams, extractedVariables: formVars } = redactParams(
      formParams,
      redactionMode,
    )
    if (globalVariablesCollector) {
      Object.assign(globalVariablesCollector, formVars)
    }

    for (const p of processedFormParams) {
      finalParameters.push({
        name: p.name,
        value: p.value,
        encode: p.encode !== false,
      })
    }
  } else if (isMultipart) {
    // Multipart form data
    postBodyRaw = false
    bodyContent = ''

    if (req.postParams) {
      const { params: processedParams, extractedVariables: mpVars } = redactParams(
        req.postParams,
        redactionMode,
      )
      if (globalVariablesCollector) Object.assign(globalVariablesCollector, mpVars)
      for (const p of processedParams) {
        finalParameters.push({ name: p.name, value: p.value, encode: false })
      }
    }

    if (req.files) {
      for (const f of req.files) {
        filesList.push({
          path: f.path,
          parameterName: f.parameterName,
          mimeType: f.mimeType,
        })
      }
    }
  } else if (req.postData) {
    // JSON / XML / GraphQL / PlainText Raw Body
    postBodyRaw = true
    const { body: redactedBody, extractedVariables: bodyVars } = redactBodyContent(
      req.postData,
      redactionMode,
    )
    bodyContent = redactedBody
    if (globalVariablesCollector) {
      Object.assign(globalVariablesCollector, bodyVars)
    }
  } else {
    // GET / Query-only: use query params
    postBodyRaw = false
    for (const p of processedQueryParams) {
      finalParameters.push({
        name: p.name,
        value: p.value,
        encode: p.encode !== false,
      })
    }
  }

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
  let cookieManagerNode: TestPlanNode | undefined

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

  // 5. Prepend UserDefinedVariables if variables were extracted
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

  return {
    nodes,
    totalSamplers: samplerCounter,
    primaryDomain,
    extractedVariables: globalVariables,
  }
}
