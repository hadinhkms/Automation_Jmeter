import type { IncomingMessage } from 'node:http'

/** Error carrying an HTTP status so route catch-blocks can answer 4xx instead of 500. */
export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
  }
}

export function statusFromError(err: unknown, fallback = 500): number {
  return err instanceof HttpError ? err.statusCode : fallback
}

export function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer | string) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try {
        const parsed: unknown = JSON.parse(body)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new HttpError(400, 'Request body must be a JSON object.'))
          return
        }
        resolve(parsed as Record<string, unknown>)
      } catch {
        reject(new HttpError(400, 'Malformed JSON request body.'))
      }
    })
    req.on('error', reject)
  })
}
