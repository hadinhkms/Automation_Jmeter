import type { RecordedRequest } from '../models/recorder'
import type { HarRoot } from '../models/har'
import { convertHarEntry } from './har/harEntryConverter'

export type { HarEntry, HarRoot } from '../models/har'
export { safeBase64Decode } from './har/harDecode'

/**
 * Parses a raw HAR file content (JSON) and transforms it into a list of RecordedRequest items.
 */
export function parseHarContent(rawJson: string): {
  success: boolean
  creator?: string
  totalEntries: number
  requests: RecordedRequest[]
  error?: string
} {
  if (!rawJson || !rawJson.trim()) {
    return {
      success: false,
      totalEntries: 0,
      requests: [],
      error: 'Empty HAR file content.',
    }
  }

  let parsed: HarRoot
  try {
    parsed = JSON.parse(rawJson)
  } catch (err) {
    return {
      success: false,
      totalEntries: 0,
      requests: [],
      error: `Invalid JSON syntax: ${err instanceof Error ? err.message : 'Parse error'}`,
    }
  }

  if (!parsed || !parsed.log || !Array.isArray(parsed.log.entries)) {
    return {
      success: false,
      totalEntries: 0,
      requests: [],
      error: 'Invalid HAR format. Root object must contain "log.entries" array.',
    }
  }

  const pageMap = new Map<string, string>()
  if (Array.isArray(parsed.log.pages)) {
    parsed.log.pages.forEach((p, idx) => {
      if (p.id) {
        pageMap.set(p.id, p.title || `Page ${idx + 1}`)
      }
    })
  }

  const requests: RecordedRequest[] = []

  for (let i = 0; i < parsed.log.entries.length; i++) {
    const record = convertHarEntry(parsed.log.entries[i], i, pageMap)
    if (record) requests.push(record)
  }

  // Preserve request order by startedDateTime
  requests.sort((a, b) => a.startTime - b.startTime)

  return {
    success: true,
    creator: parsed.log.creator
      ? `${parsed.log.creator.name || 'HAR'} ${parsed.log.creator.version || ''}`.trim()
      : undefined,
    totalEntries: requests.length,
    requests,
  }
}
