import type { IncomingMessage, ServerResponse } from 'node:http'

export interface SingleDebugRequestPayload {
  method?: string
  url?: string
  headers?: Array<{ name?: string; key?: string; value: string; enabled?: boolean }>
  body?: string
  timeoutMs?: number
}

export interface SingleDebugResponsePayload {
  status: number
  statusText: string
  latencyMs: number
  sizeBytes: number
  headers: Array<{ key: string; value: string }>
  body: string
  truncated: boolean
}

const MAX_RESPONSE_SIZE = 2 * 1024 * 1024 // 2MB hard-cap
const DEFAULT_TIMEOUT_MS = 30000 // 30s hard-cap

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let acc = ''
    req.on('data', (chunk) => { acc += chunk.toString() })
    req.on('end', () => resolve(acc))
    req.on('error', reject)
  })
}

export async function handleDebugProxy(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const reqUrl = req.url || ''
  if (reqUrl !== '/api/jmeter/proxy/send-single' || req.method !== 'POST') {
    return false
  }

  res.setHeader('Content-Type', 'application/json')
  const startTime = Date.now()

  try {
    const rawBody = await readRequestBody(req)
    const payload: SingleDebugRequestPayload = rawBody ? JSON.parse(rawBody) : {}
    const { url, method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS } = payload

    if (!url || !/^https?:\/\//i.test(url)) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Valid URL starting with http:// or https:// is required.' }))
      return true
    }

    const headersInit: Record<string, string> = {}
    if (Array.isArray(payload.headers)) {
      for (const h of payload.headers) {
        const headerName = (h.name ?? h.key ?? '').trim()
        if (headerName && h.enabled !== false) {
          headersInit[headerName] = String(h.value ?? '')
        }
      }
    }

    const controller = new AbortController()
    const effectiveTimeout = Math.min(Math.max(timeoutMs, 1000), DEFAULT_TIMEOUT_MS)
    const timer = setTimeout(() => controller.abort(), effectiveTimeout)

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: headersInit,
      signal: controller.signal,
    }

    if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
      fetchOptions.body = body
    }

    try {
      const response = await fetch(url, fetchOptions)
      clearTimeout(timer)

      const latencyMs = Date.now() - startTime
      const resHeaders: Array<{ key: string; value: string }> = []
      response.headers.forEach((val, key) => resHeaders.push({ key, value: val }))

      const responseText = await response.text()
      const sizeBytes = Buffer.byteLength(responseText, 'utf-8')
      const truncated = sizeBytes > MAX_RESPONSE_SIZE
      const finalBody = truncated ? responseText.slice(0, MAX_RESPONSE_SIZE) : responseText

      const result: SingleDebugResponsePayload = {
        status: response.status,
        statusText: response.statusText,
        latencyMs,
        sizeBytes,
        headers: resHeaders,
        body: finalBody,
        truncated,
      }

      res.statusCode = 200
      res.end(JSON.stringify(result))
    } catch (fetchErr: unknown) {
      clearTimeout(timer)
      const isAbort = (fetchErr as Error)?.name === 'AbortError'
      const latencyMs = Date.now() - startTime

      res.statusCode = isAbort ? 504 : 502
      res.end(JSON.stringify({
        status: isAbort ? 504 : 502,
        statusText: isAbort ? 'Gateway Timeout (30s exceeded)' : 'Bad Gateway',
        latencyMs,
        sizeBytes: 0,
        headers: [],
        body: (fetchErr as Error)?.message || 'Proxy request failed',
        truncated: false,
      }))
    }
  } catch (err: unknown) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: (err as Error)?.message || 'Internal proxy error' }))
  }

  return true
}
