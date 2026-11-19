import type { RecordedRequest } from '../../models/recorder'
import { isSensitiveHeader, isSensitiveKey } from './sensitiveKeys'

export function detectSensitiveInRequest(req: RecordedRequest): {
  hasSensitive: boolean
  fields: string[]
} {
  const fields: string[] = []

  for (const h of req.requestHeaders) {
    if (isSensitiveHeader(h.name) || isSensitiveKey(h.name)) {
      fields.push(`Header: ${h.name}`)
    }
  }

  if (req.queryParams) {
    for (const p of req.queryParams) {
      if (isSensitiveKey(p.name)) fields.push(`Query: ${p.name}`)
    }
  }

  if (req.postParams) {
    for (const p of req.postParams) {
      if (isSensitiveKey(p.name)) fields.push(`BodyParam: ${p.name}`)
    }
  }

  if (req.postData) {
    try {
      const parsed = JSON.parse(req.postData)
      const scanObject = (obj: unknown) => {
        if (!obj || typeof obj !== 'object') return
        // SAFETY: non-null object checked on the line above
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (isSensitiveKey(k)) fields.push(`JSON: ${k}`)
          if (typeof v === 'object') scanObject(v)
        }
      }
      scanObject(parsed)
    } catch {
      // urlencoded string check
      if (req.postData.includes('=')) {
        const pairs = req.postData.split('&')
        for (const pair of pairs) {
          const [k] = pair.split('=')
          if (k && isSensitiveKey(decodeURIComponent(k))) {
            fields.push(`Form: ${decodeURIComponent(k)}`)
          }
        }
      }
    }
  }

  return {
    hasSensitive: fields.length > 0,
    fields,
  }
}
