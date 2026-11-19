import type { RecordedRequest } from '../../models/recorder'
import { detectSensitiveInRequest } from '../redaction/detectSensitive'
import type { HarEntry } from '../../models/har'
import { parseUrlParts } from './harDecode'
import {
  extractHarHeaders,
  extractHarQueryParams,
  extractHarCookies,
  extractHarBody,
  decodeHarResponseBody,
} from './harEntryParts'

/**
 * Converts a single HAR entry into a RecordedRequest (null when the entry must be skipped).
 */
export function convertHarEntry(
  entry: HarEntry | undefined,
  i: number,
  pageMap: Map<string, string>,
): RecordedRequest | null {
  if (!entry || !entry.request || !entry.request.url) return null

  const url = entry.request.url.trim()
  if (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('chrome-extension:') ||
    url.startsWith('edge-extension:') ||
    url.startsWith('devtools:')
  ) {
    return null
  }

  const parts = parseUrlParts(url)

  // 1. Headers
  const { reqHeaders, resHeaders } = extractHarHeaders(entry, entry.request)

  // 2. Query Params
  const queryParams = extractHarQueryParams(entry.request)

  // 3. Cookies
  const cookies = extractHarCookies(entry, entry.request)

  // 4. Body & Form Params & Files
  const { postData, postParams, files } = extractHarBody(entry.request)

  // 5. Response Body decoding
  const responseBody = decodeHarResponseBody(entry)

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

  return record
}
