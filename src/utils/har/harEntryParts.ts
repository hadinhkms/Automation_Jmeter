import type {
  RecordedHeader,
  RecordedCookie,
  RecordedParam,
  RecordedFile,
} from '../../models/recorder'
import type { HarEntry } from '../../models/har'
import { safeBase64Decode } from './harDecode'

type HarRequest = NonNullable<HarEntry['request']>

export function extractHarHeaders(entry: HarEntry, request: HarRequest) {
  const reqHeaders: RecordedHeader[] = (request.headers || []).map((h) => ({
    name: h.name || '',
    value: String(h.value ?? ''),
  })).filter((h) => h.name)

  const resHeaders: RecordedHeader[] = (entry.response?.headers || []).map((h) => ({
    name: h.name || '',
    value: String(h.value ?? ''),
  })).filter((h) => h.name)

  return { reqHeaders, resHeaders }
}

export function extractHarQueryParams(request: HarRequest): RecordedParam[] {
  return (request.queryString || []).map((q) => ({
    name: q.name || '',
    value: String(q.value ?? ''),
    encode: true,
  })).filter((q) => q.name)
}

export function extractHarCookies(entry: HarEntry, request: HarRequest): RecordedCookie[] {
  const cookies: RecordedCookie[] = []
  if (Array.isArray(request.cookies)) {
    for (const c of request.cookies) {
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
  return cookies
}

export function extractHarBody(request: HarRequest) {
  let postData = request.postData?.text || ''
  const postParams: RecordedParam[] = []
  const files: RecordedFile[] = []

  const postDataParams = request.postData?.params
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

  return { postData, postParams, files }
}

export function decodeHarResponseBody(entry: HarEntry): string | undefined {
  let responseBody = entry.response?.content?.text
  if (responseBody && entry.response?.content?.encoding === 'base64') {
    responseBody = safeBase64Decode(responseBody)
  }

  // Truncate huge response bodies (> 512KB) to keep memory safe
  if (responseBody && responseBody.length > 524288) {
    responseBody = responseBody.slice(0, 524288) + '\n... [Response truncated for memory]'
  }
  return responseBody
}
