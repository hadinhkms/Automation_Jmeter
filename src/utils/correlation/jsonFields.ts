export const TOKEN_KEY_PATTERNS = [
  /token/i,
  /jwt/i,
  /access_?token/i,
  /id_?token/i,
  /auth/i,
  /session_?id/i,
  /csrf/i,
  /xsrf/i,
  /ticket/i,
  /order_?id/i,
  /user_?id/i,
  /account_?id/i,
]

export function sanitizeVariableName(key: string): string {
  return key
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toUpperCase()
    .replace(/^_+|_+$/g, '') || 'DYNAMIC_VAR'
}

/**
 * Traverses JSON object recursively to extract key-value pairs with their JSONPath
 */
export function extractJsonFields(
  obj: unknown,
  currentPath = '$',
  results: Array<{ path: string; key: string; value: string }> = [],
): Array<{ path: string; key: string; value: string }> {
  if (obj === null || obj === undefined) return results

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    const strVal = String(obj).trim()
    if (strVal.length >= 6 && strVal.length <= 1024 && !['true', 'false', 'null', 'undefined'].includes(strVal)) {
      const pathSegments = currentPath.split('.')
      const lastKey = pathSegments[pathSegments.length - 1] || 'val'
      results.push({ path: currentPath, key: lastKey, value: strVal })
    }
    return results
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      extractJsonFields(item, `${currentPath}[${index}]`, results)
    })
    return results
  }

  if (typeof obj === 'object') {
    // SAFETY: typeof object checked here and null returned early above; arrays are handled before this point
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      extractJsonFields(v, `${currentPath}.${k}`, results)
    }
  }

  return results
}
