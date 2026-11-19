import type { RecordedHeader } from '../../models/recorder'
import { STATIC_EXTENSIONS, ANALYTICS_DOMAINS, REDUNDANT_HEADERS } from './constants'

/**
 * Checks if a URL points to a static resource (images, css, fonts, maps, etc.)
 */
export function isStaticUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    const pathname = u.pathname.toLowerCase()
    const dotIdx = pathname.lastIndexOf('.')
    if (dotIdx !== -1) {
      const ext = pathname.slice(dotIdx + 1)
      if (STATIC_EXTENSIONS.has(ext)) return true
    }
  } catch {
    return false
  }
  return false
}

/**
 * Checks if a URL belongs to known tracking/analytics domains.
 */
export function isAnalyticsUrl(urlStr: string): boolean {
  const lower = urlStr.toLowerCase()
  return ANALYTICS_DOMAINS.some((d) => lower.includes(d))
}

/**
 * Cleans request headers, stripping redundant browser-internal headers.
 */
export function filterRecordedHeaders(headers: RecordedHeader[]): RecordedHeader[] {
  const result: RecordedHeader[] = []
  for (const h of headers) {
    const nameLower = h.name.toLowerCase()
    if (!REDUNDANT_HEADERS.has(nameLower)) {
      result.push({
        name: h.name,
        value: h.value,
      })
    }
  }
  return result
}
