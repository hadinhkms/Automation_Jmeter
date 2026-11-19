import type { RecordedRequest } from '../../models/recorder'
import type { CorrelationCandidate } from '../../models/correlation'
import { sanitizeVariableName } from './jsonFields'
import { discoverInSource } from './discover'
import { findCorrelationTargets } from './targets'

/**
 * Detects dynamic token and session candidates across recorded requests
 */
export function detectCorrelations(requests: RecordedRequest[]): CorrelationCandidate[] {
  const candidates: CorrelationCandidate[] = []
  const seenValues = new Set<string>()

  for (let i = 0; i < requests.length; i++) {
    const source = requests[i]
    if (!source.responseBody && (!source.responseHeaders || source.responseHeaders.length === 0)) {
      continue
    }

    const discoveredInSource = discoverInSource(source)

    // 2. Scan subsequent requests (j > i) to see if these values are used
    for (const discovered of discoveredInSource) {
      if (seenValues.has(discovered.value)) continue

      const matchingTargets = findCorrelationTargets(requests, i, discovered)

      if (matchingTargets.length > 0) {
        seenValues.add(discovered.value)
        const varName = sanitizeVariableName(discovered.key)

        candidates.push({
          id: `corr_${candidates.length + 1}_${Date.now()}`,
          variableName: varName,
          sourceRequestId: source.id,
          sourceRequestName: source.transaction ? `[${source.transaction}] ${source.method} ${source.url}` : `${source.method} ${source.url}`,
          extractorType: discovered.extractorType,
          jsonPath: discovered.jsonPath,
          regex: discovered.regex,
          sampleValue: discovered.value.length > 60 ? `${discovered.value.slice(0, 57)}...` : discovered.value,
          confidence: discovered.isHighConfidence ? 'HIGH' : 'MEDIUM',
          targets: matchingTargets,
          enabled: true,
        })
      }
    }
  }

  return candidates
}
