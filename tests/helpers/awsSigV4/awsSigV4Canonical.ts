/** AWS SigV4 canonical-request building blocks (path, query, date). Mirrored by the Groovy template. */

/** RFC 3986 encoding (unreserved: A-Z a-z 0-9 - _ . ~), as AWS requires. */
export function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

function safeDecode(value: string): string {
  try { return decodeURIComponent(value) } catch { return value }
}

/** Canonical URI: each segment normalised; non-S3 services encode it a second time. */
export function canonicalPath(rawPath: string, service: string): string {
  if (!rawPath) return '/'
  return rawPath.split('/').map((segment) => {
    const once = uriEncode(safeDecode(segment))
    return service === 's3' ? once : uriEncode(once)
  }).join('/')
}

/** Canonical query string: decoded, re-encoded, sorted by name then value. */
export function canonicalQuery(rawQuery: string): string {
  const pairs = rawQuery.replace(/^\?/, '').split('&').filter(Boolean).map((pair) => {
    const index = pair.indexOf('=')
    const name = index < 0 ? pair : pair.slice(0, index)
    const value = index < 0 ? '' : pair.slice(index + 1)
    return [uriEncode(safeDecode(name.replace(/\+/g, ' '))), uriEncode(safeDecode(value.replace(/\+/g, ' ')))]
  })
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  pairs.sort((a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1]))
  return pairs.map(([name, value]) => `${name}=${value}`).join('&')
}

export function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '')
}
