import type { TableRow } from '../../models/jmeter'
import {
  CURL_DATA_FLAGS,
  CURL_NO_ARG_FLAGS,
  pushBasicAuth,
  pushCookies,
  pushHeaderArg,
} from './curlArgHelpers'

export interface CurlArgs {
  method: string
  url: string
  headers: TableRow[]
  cookies: TableRow[]
  body: string
  isRawBody: boolean
}

/**
 * Walk tokenized cURL arguments and collect method, URL, headers, cookies and body.
 */
export function parseCurlArgs(tokens: string[]): CurlArgs {
  let method = ''
  let url = ''
  const headers: TableRow[] = []
  const cookies: TableRow[] = []
  let body = ''
  let isRawBody = false

  let i = 0
  // Skip leading 'curl' if present
  if (tokens[0] && tokens[0].toLowerCase() === 'curl') {
    i = 1
  }

  while (i < tokens.length) {
    const token = tokens[i]

    if (token === '-X' || token === '--request') {
      method = (tokens[i + 1] || '').toUpperCase()
      i += 2
      continue
    }

    if (token === '-H' || token === '--header') {
      pushHeaderArg(tokens[i + 1] || '', headers)
      i += 2
      continue
    }

    if (token === '-b' || token === '--cookie') {
      pushCookies(tokens[i + 1] || '', cookies)
      i += 2
      continue
    }

    if (token === '-A' || token === '--user-agent') {
      headers.push({ name: 'User-Agent', value: tokens[i + 1] || '' })
      i += 2
      continue
    }

    if (token === '-u' || token === '--user') {
      pushBasicAuth(tokens[i + 1] || '', headers)
      i += 2
      continue
    }

    if (CURL_DATA_FLAGS.has(token)) {
      const dataStr = tokens[i + 1] || ''
      if (body) {
        body += '&' + dataStr
      } else {
        body = dataStr
      }
      isRawBody = true
      if (!method) method = 'POST'
      i += 2
      continue
    }

    // Flags that don't take arguments
    if (CURL_NO_ARG_FLAGS.has(token)) {
      i += 1
      continue
    }

    // If it looks like a URL and not an option flag
    if (!token.startsWith('-') && !url) {
      url = token
      i += 1
      continue
    }

    i += 1
  }

  if (!method) {
    method = body ? 'POST' : 'GET'
  }

  return { method, url, headers, cookies, body, isRawBody }
}
