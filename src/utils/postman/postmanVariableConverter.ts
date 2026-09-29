import { transpileVariablesToJMeter } from './dynamicVariablesEngine'

/**
 * Converts Postman variable syntax {{variable_name}} to JMeter syntax ${variable_name}.
 */
export function postmanToJMeterVar(input: string): string {
  if (!input) return ''
  return transpileVariablesToJMeter(input)
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

  const converted = transpileVariablesToJMeter(raw)
  let protocol = 'https'
  let domain = ''
  let port = ''
  let path = ''

  try {
    // 1. Matches protocol like http:// or https:// (or variable protocol like ${protocol}://)
    const match = converted.match(/^(https?|\$\{[^}]+\}):\/\/([^/:?#]+)(?::(\d+|\$\{[^}]+\}))?(\/[^?#]*)?/i)
    if (match) {
      protocol = match[1].toLowerCase()
      domain = match[2]
      port = match[3] || ''
      path = match[4] || '/'
    } else if (converted.startsWith('${')) {
      // 2. Starts with a variable like ${baseUrl}/path or ${domain}/path
      const slashIndex = converted.indexOf('/')
      if (slashIndex !== -1) {
        domain = converted.slice(0, slashIndex)
        path = converted.slice(slashIndex)
      } else {
        domain = converted
        path = '/'
      }
    } else {
      path = converted.startsWith('/') ? converted : `/${converted}`
    }
  } catch {
    path = converted
  }

  return { raw: converted, protocol, domain, port, path }
}
