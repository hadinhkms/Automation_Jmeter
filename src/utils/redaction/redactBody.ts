import { getJMeterVariableName, isSensitiveKey, maskString } from './sensitiveKeys'

export function redactBodyContent(
  bodyStr: string,
  mode: 'mask' | 'parameterize' | 'none',
): { body: string; extractedVariables: Record<string, string> } {
  const extractedVariables: Record<string, string> = {}
  if (!bodyStr || mode === 'none') {
    return { body: bodyStr, extractedVariables }
  }

  const trimmed = bodyStr.trim()

  // 1. JSON Body
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed)
      const transform = (obj: unknown): unknown => {
        if (!obj || typeof obj !== 'object') return obj
        if (Array.isArray(obj)) return obj.map(transform)

        const output: Record<string, unknown> = {}
        // SAFETY: non-null, non-array object checked above
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          if (isSensitiveKey(key) && typeof value === 'string') {
            const varName = getJMeterVariableName(key)
            if (mode === 'parameterize') {
              extractedVariables[varName] = value
              output[key] = `\${${varName}}`
            } else {
              output[key] = maskString(value)
            }
          } else if (typeof value === 'object') {
            output[key] = transform(value)
          } else {
            output[key] = value
          }
        }
        return output
      }

      const redactedJson = transform(parsed)
      return {
        body: JSON.stringify(redactedJson, null, 2),
        extractedVariables,
      }
    } catch {
      // Fallback
    }
  }

  // 2. Form URL-encoded
  if (trimmed.includes('=') && !trimmed.includes('\n')) {
    try {
      const pairs = trimmed.split('&')
      const updatedPairs: string[] = []
      for (const pair of pairs) {
        const [rawKey, rawVal] = pair.split('=')
        if (rawKey !== undefined) {
          const key = decodeURIComponent(rawKey)
          const val = rawVal !== undefined ? decodeURIComponent(rawVal) : ''
          if (isSensitiveKey(key)) {
            const varName = getJMeterVariableName(key)
            if (mode === 'parameterize') {
              extractedVariables[varName] = val
              updatedPairs.push(`${encodeURIComponent(key)}=\${${varName}}`)
            } else {
              updatedPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(maskString(val))}`)
            }
          } else {
            updatedPairs.push(pair)
          }
        }
      }
      return { body: updatedPairs.join('&'), extractedVariables }
    } catch {
      // Fallback
    }
  }

  return { body: bodyStr, extractedVariables }
}
