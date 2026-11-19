import type { RecordedRequest } from '../../models/recorder'
import type { CorrelationTarget, DiscoveredValue } from '../../models/correlation'
import { sanitizeVariableName } from './jsonFields'

/**
 * Scans subsequent requests (j > i) to see if the discovered value is used.
 */
export function findCorrelationTargets(
  requests: RecordedRequest[],
  i: number,
  discovered: DiscoveredValue,
): CorrelationTarget[] {
  const matchingTargets: CorrelationTarget[] = []

  for (let j = i + 1; j < requests.length; j++) {
    const target = requests[j]
    const targetName = target.transaction ? `[${target.transaction}] ${target.method} ${target.url}` : `${target.method} ${target.url}`

    // A. Check in Headers
    if (target.requestHeaders) {
      for (const h of target.requestHeaders) {
        if (h.value.includes(discovered.value)) {
          matchingTargets.push({
            targetRequestId: target.id,
            targetRequestName: targetName,
            location: 'header',
            field: h.name,
            originalValue: discovered.value,
            replacementExpression: `\${${sanitizeVariableName(discovered.key)}}`,
          })
        }
      }
    }

    // B. Check in Post Body
    if (target.postData && target.postData.includes(discovered.value)) {
      matchingTargets.push({
        targetRequestId: target.id,
        targetRequestName: targetName,
        location: 'body',
        originalValue: discovered.value,
        replacementExpression: `\${${sanitizeVariableName(discovered.key)}}`,
      })
    }

    // C. Check in Query Params / URL
    if (target.url.includes(discovered.value)) {
      matchingTargets.push({
        targetRequestId: target.id,
        targetRequestName: targetName,
        location: 'url',
        originalValue: discovered.value,
        replacementExpression: `\${${sanitizeVariableName(discovered.key)}}`,
      })
    }
  }

  return matchingTargets
}
