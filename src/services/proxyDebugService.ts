export interface SingleRequestConfig {
  method: string
  url: string
  headers?: Array<{ name?: string; key?: string; value: string; enabled?: boolean }>
  body?: string
  timeoutMs?: number
}

export interface SingleResponseResult {
  status: number
  statusText: string
  latencyMs: number
  sizeBytes: number
  headers: Array<{ key: string; value: string }>
  body: string
  truncated: boolean
  error?: string
}

class ProxyDebugService {
  async sendSingleRequest(config: SingleRequestConfig): Promise<SingleResponseResult> {
    try {
      const response = await fetch('/api/jmeter/proxy/send-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const data = await response.json()
      if (!response.ok && !data.status) {
        return {
          status: response.status,
          statusText: response.statusText,
          latencyMs: 0,
          sizeBytes: 0,
          headers: [],
          body: data.error || 'Request failed.',
          truncated: false,
          error: data.error,
        }
      }

      return {
        status: data.status,
        statusText: data.statusText || '',
        latencyMs: data.latencyMs || 0,
        sizeBytes: data.sizeBytes || 0,
        headers: Array.isArray(data.headers) ? data.headers : [],
        body: typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2),
        truncated: Boolean(data.truncated),
        error: data.error,
      }
    } catch (err: unknown) {
      return {
        status: 0,
        statusText: 'Network / Client Error',
        latencyMs: 0,
        sizeBytes: 0,
        headers: [],
        body: err instanceof Error ? err.message : String(err),
        truncated: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }
}

export const proxyDebugService = new ProxyDebugService()
