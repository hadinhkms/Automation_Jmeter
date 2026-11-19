import http from 'node:http'
import type WebSocket from 'ws'

export function fetchJson<T = unknown>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            // SAFETY: Chrome /json endpoints return the documented JSON shape the caller asks for
            resolve(JSON.parse(data) as T)
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

export async function waitForDebuggerUrl(port: number, retries = 30): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const list = await fetchJson<Array<{ type?: string; webSocketDebuggerUrl?: string }>>(`http://127.0.0.1:${port}/json/list`)
      if (Array.isArray(list) && list.length > 0) {
        const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) || list[0]
        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl
        }
      }
    } catch {
      // Wait and retry
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Could not connect to Chrome/Edge DevTools on port ${port}. Please ensure browser is not blocked.`)
}

export function buildBrowserLaunchArgs(port: number, profileDir: string): string[] {
  return [
    `--remote-debugging-port=${port}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${profileDir}`,
    '--new-window',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-default-apps',
    '--window-size=1280,800',
    '--start-maximized',
    'about:blank',
  ]
}

export const NETWORK_ENABLE_PARAMS = {
  maxTotalBufferSize: 10485760,
  maxResourceBufferSize: 5242880,
  maxPostDataSize: 1048576,
}

/** Resolves once the socket opens; rejects on error or after 6s. */
export function waitForSocketOpen(ws: WebSocket): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout.')), 6000)
    ws.on('open', () => {
      clearTimeout(timeout)
      resolve()
    })
    ws.on('error', (err: Error) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

export type CdpCallback = (res: { error?: { message?: string }; result?: unknown }) => void

/** Routes a raw CDP message to its pending command callback, or to `onEvent`. Parse errors are ignored. */
export function dispatchCdpMessage(
  data: WebSocket.RawData,
  callbacks: Map<number, CdpCallback>,
  onEvent: (method: string, params: Record<string, unknown> | undefined) => void,
): void {
  try {
    const msg = JSON.parse(data.toString())
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id)!
      callbacks.delete(msg.id)
      cb(msg)
      return
    }

    onEvent(msg.method, msg.params)
  } catch {
    // Ignore parse errors
  }
}

export function closeSocketQuietly(ws: WebSocket): void {
  try {
    ws.close()
  } catch {
    // Ignore ws close error
  }
}
