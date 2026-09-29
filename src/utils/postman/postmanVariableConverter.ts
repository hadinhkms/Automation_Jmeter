/**
 * Converts Postman variable syntax {{variable_name}} to JMeter syntax ${variable_name}.
 */
export function postmanToJMeterVar(input: string): string {
  if (!input) return ''
  return input.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, '${$1}')
}

/**
 * Normalizes a Postman URL which can be either a string or structured PostmanUrl object.
 */
export function normalizePostmanUrl(urlInput: unknown): {
  raw: string
  protocol: string
  domain: string
  port: string
  path: string
} {
  let raw = ''
  if (typeof urlInput === 'string') {
    raw = urlInput
  } else if (urlInput && typeof urlInput === 'object') {
    const obj = urlInput as { raw?: string }
    raw = obj.raw || ''
  }

  const converted = postmanToJMeterVar(raw)
  let protocol = 'https'
  let domain = ''
  let port = ''
  let path = ''

  try {
    // If it has protocol like http:// or https://
    const match = converted.match(/^(https?):\/\/([^/:?#]+)(?::(\d+))?(\/[^?#]*)?/i)
    if (match) {
      protocol = match[1].toLowerCase()
      domain = match[2]
      port = match[3] || ''
      path = match[4] || '/'
    } else {
      path = converted.startsWith('/') ? converted : `/${converted}`
    }
  } catch {
    path = converted
  }

  return { raw: converted, protocol, domain, port, path }
}
