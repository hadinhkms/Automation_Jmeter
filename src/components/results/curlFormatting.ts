/**
 * Wrap a value in POSIX single quotes. A literal ' cannot be escaped inside '...',
 * so it is closed, emitted as \', and reopened: it's -> 'it'\''s'. Postman's cURL importer parses this form.
 */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/**
 * Convert JMeter variables that could not be resolved (${token}) into Postman variables ({{token}}),
 * so the pasted request can be filled from a Postman environment. JMeter functions (${__time()}) are left as-is.
 */
export function toPostmanVariables(value: string): string {
  return value.replace(/\$\{(?!__)([A-Za-z0-9_.-]+)\}/g, '{{$1}}')
}

const HTTP_TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

/** RFC 7230 header field-name (token). Rejects request lines such as "GET https" that contain a space. */
export function isValidHeaderName(name: string): boolean {
  return HTTP_TOKEN.test(name)
}
