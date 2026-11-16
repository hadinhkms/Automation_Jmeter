import type { Connect } from 'vite'
import type { ServerResponse } from 'node:http'

/** A route group: returns true when it handled (and answered) the request. */
export type RouteHandler = (req: Connect.IncomingMessage, res: ServerResponse, url: string) => Promise<boolean>

/** Writes a JSON body; sets the status code first when given. */
export function sendJson(res: ServerResponse, data: unknown, statusCode?: number) {
  if (statusCode !== undefined) res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export function requestUrl(req: Connect.IncomingMessage, url: string): URL {
  return new URL(url, `http://${req.headers.host || 'localhost'}`)
}

/** Opens a Server-Sent Events response and returns a typed event writer. */
export function openSse(res: ServerResponse): (event: string, data: unknown) => void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  return (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }
}
