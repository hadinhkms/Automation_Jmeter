import type { RecordedRequest } from '../../models/recorder'
import type { DiscoveredValue } from '../../models/correlation'
import { TOKEN_KEY_PATTERNS, extractJsonFields } from './jsonFields'

/**
 * Collects candidate dynamic values from a source request's response body.
 */
export function discoverInSource(source: RecordedRequest): DiscoveredValue[] {
  const discoveredInSource: DiscoveredValue[] = []

  // 1. Check JSON Response Body
  if (source.responseBody) {
    try {
      const parsedJson = JSON.parse(source.responseBody)
      const fields = extractJsonFields(parsedJson)

      for (const field of fields) {
        const isKeyInteresting = TOKEN_KEY_PATTERNS.some((p) => p.test(field.key))
        const isValJwt = field.value.startsWith('ey') && field.value.split('.').length === 3
        const isHigh = isKeyInteresting || isValJwt

        discoveredInSource.push({
          key: field.key,
          value: field.value,
          jsonPath: field.path,
          extractorType: 'JSONExtractor',
          isHighConfidence: isHigh,
        })
      }
    } catch {
      // Not valid JSON, search for token patterns via Regex
      for (const pattern of TOKEN_KEY_PATTERNS) {
        const regexStr = `["']?(${pattern.source})["']?\\s*[:=]\\s*["']([^"']{8,512})["']`
        const regex = new RegExp(regexStr, 'i')
        const match = source.responseBody.match(regex)
        if (match && match[2]) {
          discoveredInSource.push({
            key: match[1],
            value: match[2],
            regex: `"${match[1]}":"([^"]+)"`,
            extractorType: 'RegexExtractor',
            isHighConfidence: true,
          })
        }
      }
    }
  }

  return discoveredInSource
}
