import type { RecordedRequest, RecordedHeader, RecordedParam } from '../../src/models/recorder'
import { parseUrlDetails } from './urlDetails'
import type { CdpEventContext, CdpParams } from './cdpEventContext'

const toHeaderList = (headers: Record<string, string> | undefined): RecordedHeader[] =>
  Object.entries(headers || {}).map(([name, value]) => ({
    name,
    value: String(value),
  }))

const isInternalUrl = (url: string): boolean =>
  url.startsWith('data:') ||
  url.startsWith('chrome-extension:') ||
  url.startsWith('edge-extension:') ||
  url.startsWith('blob:') ||
  url.startsWith('devtools:') ||
  url === 'about:blank'

function parseFormPostParams(request: { headers?: Record<string, string>; postData?: string }): RecordedParam[] {
  const postParams: RecordedParam[] = []
  if (request.postData && request.headers && String(request.headers['content-type'] || '').includes('application/x-www-form-urlencoded')) {
    const pairs = request.postData.split('&')
    for (const p of pairs) {
      const [k, v] = p.split('=')
      if (k) {
        postParams.push({
          name: decodeURIComponent(k),
          value: v ? decodeURIComponent(v) : '',
          encode: true,
        })
      }
    }
  }
  return postParams
}

export function onRequestWillBeSent(ctx: CdpEventContext, params: CdpParams): void {
  // SAFETY: Network.requestWillBeSent params follow this CDP shape; optional fields are guarded below
  const { requestId, request, timestamp, type, initiator, redirectResponse } = params as {
    requestId: string
    request: { url?: string; method?: string; headers?: Record<string, string>; postData?: string }
    timestamp?: number
    type?: string
    initiator?: { type?: string }
    redirectResponse?: { status?: number; statusText?: string; headers?: Record<string, string> }
  }
  const url = request.url || ''

  // Skip internal browser schemes
  if (isInternalUrl(url)) return

  // Handle redirect chain
  if (redirectResponse) {
    const prev = ctx.requests.find((r) => r.requestId === requestId)
    if (prev) {
      prev.responseStatus = redirectResponse.status
      prev.responseStatusText = redirectResponse.statusText
      prev.responseHeaders = toHeaderList(redirectResponse.headers)
      ctx.emit('request-updated', prev)
    }
  }

  const parsedUrl = parseUrlDetails(url)
  const headers = toHeaderList(request.headers)

  // Parse post data params if form urlencoded
  const postParams = parseFormPostParams(request)

  const newRecord: RecordedRequest = {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    requestId,
    transaction: ctx.transaction,
    timestamp: Date.now(),
    url,
    method: (request.method || 'GET').toUpperCase(),
    protocol: parsedUrl.protocol,
    server: parsedUrl.server,
    port: parsedUrl.port,
    path: parsedUrl.path,
    resourceType: type || initiator?.type || 'XHR',
    requestHeaders: headers,
    queryParams: parsedUrl.queryParams.length > 0 ? parsedUrl.queryParams : undefined,
    postParams: postParams.length > 0 ? postParams : undefined,
    postData: request.postData,
    startTime: typeof timestamp === 'number' ? timestamp : Date.now() / 1000,
  }

  // Buffer size cap (max 1000 items)
  if (ctx.requests.length >= ctx.maxRequestsInMemory) {
    ctx.requests.shift()
  }

  ctx.requests.push(newRecord)
  ctx.emit('request-added', newRecord)
}

export function onResponseReceived(ctx: CdpEventContext, params: CdpParams): void {
  // SAFETY: Network.responseReceived params follow this CDP shape; optional fields are guarded below
  const { requestId, response, timestamp } = params as {
    requestId: string
    response: { status?: number; statusText?: string; mimeType?: string; headers?: Record<string, string> }
    timestamp?: number
  }
  const record = ctx.requests.find((r) => r.requestId === requestId)
  if (record) {
    record.responseStatus = response.status
    record.responseStatusText = response.statusText
    record.mimeType = response.mimeType
    record.responseHeaders = toHeaderList(response.headers)
    if (record.startTime && timestamp) {
      record.durationMs = Math.max(1, Math.round((timestamp - record.startTime) * 1000))
    }
    ctx.emit('request-updated', record)
  }
}

const isTextualMime = (mimeType: string | undefined): boolean =>
  Boolean(
    mimeType &&
      (mimeType.includes('json') ||
        mimeType.includes('text') ||
        mimeType.includes('xml') ||
        mimeType.includes('javascript') ||
        mimeType.includes('html')),
  )

export function onLoadingFinished(ctx: CdpEventContext, params: CdpParams): void {
  // SAFETY: Network.loadingFinished params follow this CDP shape; encodedDataLength may be absent
  const { requestId, encodedDataLength } = params as {
    requestId: string
    encodedDataLength?: number
  }
  const record = ctx.requests.find((r) => r.requestId === requestId)
  if (record) {
    record.sizeBytes = encodedDataLength
    record.endTime = Date.now()

    // Fetch response body for text/json/xml/html responses <= 512KB
    if (isTextualMime(record.mimeType)) {
      ctx
        .sendCdp<{ body?: string; base64Encoded?: boolean }>('Network.getResponseBody', { requestId })
        .then((res) => {
          if (res && res.body) {
            let bodyText = res.base64Encoded ? Buffer.from(res.body, 'base64').toString('utf8') : res.body
            if (bodyText.length > 524288) {
              bodyText = bodyText.slice(0, 524288) + '\n... [Response truncated for memory]'
            }
            record.responseBody = bodyText
            ctx.emit('request-updated', record)
          }
        })
        .catch(() => {
          // Ignore body fetch failure
        })
    }

    ctx.emit('request-updated', record)
  }
}

export function onLoadingFailed(ctx: CdpEventContext, params: CdpParams): void {
  // SAFETY: Network.loadingFailed params follow this CDP shape; errorText may be absent
  const { requestId, errorText } = params as {
    requestId: string
    errorText?: string
  }
  const record = ctx.requests.find((r) => r.requestId === requestId)
  if (record) {
    record.error = errorText
    ctx.emit('request-updated', record)
  }
}
