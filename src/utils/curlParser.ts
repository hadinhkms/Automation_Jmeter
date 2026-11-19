import type { TableRow } from '../models/jmeter'
import type { ParsedCurl } from '../models/curl'
import { tokenizeCurl } from './curl/tokenize'
import { parseCurlArgs } from './curl/curlArgs'
import { parseCurlUrl } from './curl/curlUrl'

export type { ParsedCurl } from '../models/curl'
export { tokenizeCurl } from './curl/tokenize'
export { convertCurlToNodes } from './curl/convertCurl'

/**
 * Parse a raw cURL command into structured JMeter request attributes.
 */
export function parseCurlCommand(rawCurl: string): ParsedCurl {
  const tokens = tokenizeCurl(rawCurl)
  const args = parseCurlArgs(tokens)
  const { method, url, headers, cookies, body } = args
  let isRawBody = args.isRawBody
  const parameters: TableRow[] = []

  // Parse URL components
  const { protocol, server, port, path } = parseCurlUrl(url, body, parameters)

  // Check if body is JSON
  if (body) {
    const trimmed = body.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      isRawBody = true
    }
  }

  // Generate suggested sampler name from method and path
  let suggestedName = `${method} ${path.split('?')[0] || '/'}`
  if (suggestedName.length > 50) {
    suggestedName = suggestedName.slice(0, 47) + '...'
  }
  if (!url) {
    suggestedName = 'HTTP Request (from cURL)'
  }

  return {
    raw: rawCurl,
    method,
    url,
    protocol,
    server,
    port,
    path,
    headers,
    cookies,
    parameters,
    body,
    isRawBody,
    suggestedName,
  }
}
