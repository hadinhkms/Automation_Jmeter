/** Path and Content-Type rules for the Local Mock Server; shared by client and dev server. */

/** `type/subtype` with optional `; name=value` (token or quoted) parameters, per RFC 9110 media-type syntax. */
const MEDIA_TYPE = /^[\w!#$%&'*+.^`|~-]+\/[\w!#$%&'*+.^`|~-]+(\s*;\s*[\w!#$%&'*+.^`|~-]+=([\w!#$%&'*+.^`|~-]+|"[^"\\]*"))*$/
export const MOCK_MAX_CONTENT_TYPE_CHARS = 100

/** Returns an error message, or '' when `contentType` is a single safe media type (no CR/LF or other controls). */
export function validateContentType(contentType: unknown): string {
  if (typeof contentType !== 'string' || !contentType.trim()) return 'Content-Type is required.'
  if (contentType.length > MOCK_MAX_CONTENT_TYPE_CHARS) return `Content-Type is longer than ${MOCK_MAX_CONTENT_TYPE_CHARS} characters.`
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(contentType) || !MEDIA_TYPE.test(contentType.trim())) {
    return 'Content-Type must be a media type like application/json or text/plain; charset=utf-8.'
  }
  return ''
}

/** Returns an error message, or '' when `path` is a valid mock route path. */
export function validateMockPath(path: string, prefix: string): string {
  if (!path.startsWith(prefix) || path.length <= prefix.length) {
    return 'Path must start with /mock/ and name an endpoint, e.g. /mock/sms/send.'
  }
  if (/[\s?#]/.test(path)) return 'Path cannot contain spaces, "?" or "#".'
  if (path.endsWith('/')) return 'Path cannot end with "/" (use /mock/a, which also answers /mock/a/).'
  if (path.includes('//')) return 'Path cannot contain empty segments ("//").'
  return ''
}

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/** Key used for the duplicate check: decoded segments, with every `:param` treated as the same wildcard. */
export function mockPathKey(path: string): string {
  return path.trim().replace(/\/+$/, '').split('/').map((s) => (s.startsWith(':') ? ':' : decodeSegment(s) ?? s)).join('/')
}

/** True when the route path uses `:param` or a trailing `*` (exact paths win over these). */
export function isPatternPath(path: string): boolean {
  const segs = path.trim().split('/')
  return segs.some((s) => s.startsWith(':')) || segs[segs.length - 1] === '*'
}

/**
 * Matches a raw (still percent-encoded, no query string) request path against a route pattern.
 * Splits on raw `/` first and decodes each segment after, so `/mock/a%2Fb` never matches `/mock/a/b`.
 */
export function mockPathMatches(pattern: string, requestPath: string): boolean {
  const pat = pattern.trim().replace(/\/+$/, '').split('/').map((s) => decodeSegment(s) ?? s)
  const req = requestPath.replace(/\/+$/, '').split('/').map(decodeSegment)
  if (req.some((s) => s === null)) return false
  for (let i = 0; i < pat.length; i++) {
    if (pat[i] === '*' && i === pat.length - 1) return req.length >= pat.length
    if (i >= req.length) return false
    if (pat[i].startsWith(':') && req[i] !== '') continue
    if (pat[i] !== req[i]) return false
  }
  return pat.length === req.length
}
