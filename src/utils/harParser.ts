// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import type {
  RecordedRequest,
  RecordedHeader,
  RecordedCookie,
  RecordedParam,
  RecordedFile,
} from '../models/recorder'
import { detectSensitiveInRequest } from './redactionUtils'

export interface HarEntry {
  startedDateTime?: string
  time?: number
  pageref?: string
  request?: {
    method?: string
    url?: string
    httpVersion?: string
    headers?: Array<{ name: string; value: string }>
    queryString?: Array<{ name: string; value: string }>
    cookies?: Array<{
      name: string
      value: string
      path?: string
      domain?: string
      expires?: string
      httpOnly?: boolean
      secure?: boolean
    }>
    headersSize?: number
    bodySize?: number
    postData?: {
      mimeType?: string
      text?: string
      params?: Array<{
        name: string
        value?: string
        fileName?: string
        contentType?: string
        comment?: string
      }>
    }
  }
  response?: {
    status?: number
    statusText?: string
    httpVersion?: string
    headers?: Array<{ name: string; value: string }>
    cookies?: Array<{
      name: string
      value: string
      path?: string
      domain?: string
      expires?: string
      httpOnly?: boolean
      secure?: boolean
    }>
    content?: {
      size?: number
      mimeType?: string
      text?: string
      encoding?: string
    }
    redirectURL?: string
    headersSize?: number
    bodySize?: number
  }
  _resourceType?: string
}

export interface HarRoot {
  log?: {
    version?: string
    creator?: { name?: string; version?: string }
    pages?: Array<{ id?: string; title?: string; startedDateTime?: string }>
    entries?: HarEntry[]
  }
}

/**
 * Safe Base64 decoding supporting UTF-8 and Unicode characters.
 */
export function safeBase64Decode(base64Str: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64Str, 'base64').toString('utf-8')
    }
    const binary = atob(base64Str)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    try {
      return atob(base64Str)
    } catch {
      return base64Str
    }
  }
}

function parseUrlParts(urlStr: string) {
  try {
    let toParse = urlStr
    if (!/^https?:\/\//i.test(toParse)) toParse = `https://${toParse}`
    const u = new URL(toParse)
    return {
      protocol: u.protocol.replace(':', '').toLowerCase(),
      server: u.hostname,
      port: u.port || '',
      path: (u.pathname + u.search) || '/',
      cleanPath: u.pathname || '/',
    }
  } catch {
    const qIdx = urlStr.indexOf('?')
    const cleanPath = qIdx !== -1 ? urlStr.slice(0, qIdx) : urlStr
    return {
      protocol: 'https',
      server: '',
      port: '',
      path: urlStr || '/',
      cleanPath: cleanPath || '/',
    }
  }
}

/**
 * Parses a raw HAR file content (JSON) and transforms it into a list of RecordedRequest items.
 */
export function parseHarContent(rawJson: string): {
  success: boolean
  creator?: string
  totalEntries: number
  requests: RecordedRequest[]
  error?: string
} {
  if (!rawJson || !rawJson.trim()) {
    return {
      success: false,
      totalEntries: 0,
      requests: [],
      error: 'Empty HAR file content.',
    }
  }

  let parsed: HarRoot
  try {
    parsed = JSON.parse(rawJson)
  } catch (err) {
    return {
      success: false,
      totalEntries: 0,
      requests: [],
      error: `Invalid JSON syntax: ${err instanceof Error ? err.message : 'Parse error'}`,
    }
  }

  if (!parsed || !parsed.log || !Array.isArray(parsed.log.entries)) {
    return {
      success: false,
      totalEntries: 0,
      requests: [],
      error: 'Invalid HAR format. Root object must contain "log.entries" array.',
    }
  }

  const pageMap = new Map<string, string>()
  if (Array.isArray(parsed.log.pages)) {
    parsed.log.pages.forEach((p, idx) => {
      if (p.id) {
        pageMap.set(p.id, p.title || `Page ${idx + 1}`)
      }
    })
  }

  const requests: RecordedRequest[] = []

  for (let i = 0; i < parsed.log.entries.length; i++) {
    const entry = parsed.log.entries[i]
    if (!entry || !entry.request || !entry.request.url) continue

    const url = entry.request.url.trim()
    if (
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('chrome-extension:') ||
      url.startsWith('edge-extension:') ||
      url.startsWith('devtools:')
    ) {
      continue
    }

    const parts = parseUrlParts(url)

    // 1. Headers
    const reqHeaders: RecordedHeader[] = (entry.request.headers || []).map((h) => ({
      name: h.name || '',
      value: String(h.value ?? ''),
    })).filter((h) => h.name)

    const resHeaders: RecordedHeader[] = (entry.response?.headers || []).map((h) => ({
      name: h.name || '',
      value: String(h.value ?? ''),
    })).filter((h) => h.name)

    // 2. Query Params
    const queryParams: RecordedParam[] = (entry.request.queryString || []).map((q) => ({
      name: q.name || '',
      value: String(q.value ?? ''),
      encode: true,
    })).filter((q) => q.name)

    // 3. Cookies
    const cookies: RecordedCookie[] = []
    if (Array.isArray(entry.request.cookies)) {
      for (const c of entry.request.cookies) {
        if (c.name) {
          cookies.push({
            name: c.name,
            value: String(c.value ?? ''),
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            expires: c.expires,
          })
        }
      }
    }
    if (Array.isArray(entry.response?.cookies)) {
      for (const c of entry.response!.cookies) {
        if (c.name && !cookies.some((existing) => existing.name === c.name)) {
          cookies.push({
            name: c.name,
            value: String(c.value ?? ''),
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            expires: c.expires,
          })
        }
      }
    }

    // 4. Body & Form Params & Files
    let postData = entry.request.postData?.text || ''
    const postParams: RecordedParam[] = []
    const files: RecordedFile[] = []

    const postDataParams = entry.request.postData?.params
    if (Array.isArray(postDataParams) && postDataParams.length > 0) {
      for (const p of postDataParams) {
        if (p.fileName) {
          files.push({
            path: p.fileName,
            parameterName: p.name || 'file',
            mimeType: p.contentType || 'application/octet-stream',
          })
        } else if (p.name) {
          postParams.push({
            name: p.name,
            value: String(p.value ?? ''),
            encode: true,
          })
        }
      }

      if (!postData && postParams.length > 0) {
        postData = postParams
          .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`)
          .join('&')
      }
    }

    // 5. Response Body decoding
    let responseBody = entry.response?.content?.text
    if (responseBody && entry.response?.content?.encoding === 'base64') {
      responseBody = safeBase64Decode(responseBody)
    }

    // Truncate huge response bodies (> 512KB) to keep memory safe
    if (responseBody && responseBody.length > 524288) {
      responseBody = responseBody.slice(0, 524288) + '\n... [Response truncated for memory]'
    }

    // 6. Transaction naming
    const pageref = entry.pageref
    const transaction = pageref && pageMap.has(pageref)
      ? pageMap.get(pageref)!
      : 'HAR Imported Requests'

    const record: RecordedRequest = {
      id: `har-${i + 1}-${Math.random().toString(36).slice(2, 6)}`,
      requestId: `har-req-${i + 1}`,
      transaction,
      timestamp: entry.startedDateTime ? new Date(entry.startedDateTime).getTime() : Date.now(),
      url,
      method: (entry.request.method || 'GET').toUpperCase(),
      protocol: parts.protocol,
      server: parts.server,
      port: parts.port,
      path: parts.path,
      resourceType: entry._resourceType || entry.response?.content?.mimeType || 'XHR',
      requestHeaders: reqHeaders,
      queryParams: queryParams.length > 0 ? queryParams : undefined,
      postParams: postParams.length > 0 ? postParams : undefined,
      files: files.length > 0 ? files : undefined,
      cookies: cookies.length > 0 ? cookies : undefined,
      postData: postData || undefined,
      responseStatus: entry.response?.status,
      responseStatusText: entry.response?.statusText,
      responseHeaders: resHeaders,
      responseBody: responseBody || undefined,
      mimeType: entry.request.postData?.mimeType || reqHeaders.find((h) => h.name.toLowerCase() === 'content-type')?.value || entry.response?.content?.mimeType,
      durationMs: entry.time ? Math.max(1, Math.round(entry.time)) : undefined,
      startTime: entry.startedDateTime ? new Date(entry.startedDateTime).getTime() : Date.now(),
      sizeBytes: entry.response?.content?.size || entry.response?.bodySize,
    }

    // 7. Sensitive data detection
    const sensitivity = detectSensitiveInRequest(record)
    record.hasSensitiveData = sensitivity.hasSensitive
    record.sensitiveFields = sensitivity.fields

    requests.push(record)
  }

  // Preserve request order by startedDateTime
  requests.sort((a, b) => a.startTime - b.startTime)

  return {
    success: true,
    creator: parsed.log.creator
      ? `${parsed.log.creator.name || 'HAR'} ${parsed.log.creator.version || ''}`.trim()
      : undefined,
    totalEntries: requests.length,
    requests,
  }
}
