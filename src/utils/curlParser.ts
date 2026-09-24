// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import type { TableRow, TestPlanNode } from '../models/jmeter'
import { createNode } from '../mock/sampleTestPlan'

export interface ParsedCurl {
  raw: string
  method: string
  url: string
  protocol: string
  server: string
  port: string
  path: string
  headers: TableRow[]
  cookies: TableRow[]
  parameters: TableRow[]
  body: string
  isRawBody: boolean
  suggestedName: string
}

/**
 * Tokenize a cURL command string handling quotes, escaped quotes, and line continuations (\ or ^ or `).
 */
export function tokenizeCurl(curlStr: string): string[] {
  const tokens: string[] = []
  // Normalize line continuations (\ at end of line in bash, ^ in cmd, ` in powershell)
  const normalized = curlStr
    .replace(/\\[\r\n]+/g, ' ')
    .replace(/\^[\r\n]+/g, ' ')
    .replace(/`[\r\n]+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim()

  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]

    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\' && !inSingleQuote) {
      escaped = true
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if ((char === ' ' || char === '\t') && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

/**
 * Parse a raw cURL command into structured JMeter request attributes.
 */
export function parseCurlCommand(rawCurl: string): ParsedCurl {
  const tokens = tokenizeCurl(rawCurl)
  
  let method = ''
  let url = ''
  const headers: TableRow[] = []
  const cookies: TableRow[] = []
  const parameters: TableRow[] = []
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
      const headerStr = tokens[i + 1] || ''
      const colonIdx = headerStr.indexOf(':')
      if (colonIdx !== -1) {
        const name = headerStr.slice(0, colonIdx).trim()
        const value = headerStr.slice(colonIdx + 1).trim()
        headers.push({ name, value })
      }
      i += 2
      continue
    }

    if (token === '-b' || token === '--cookie') {
      const cookieStr = tokens[i + 1] || ''
      const pairs = cookieStr.split(';')
      for (const pair of pairs) {
        const eqIdx = pair.indexOf('=')
        if (eqIdx !== -1) {
          cookies.push({
            name: pair.slice(0, eqIdx).trim(),
            value: pair.slice(eqIdx + 1).trim(),
            domain: '',
            path: '',
            secure: false,
            expires: '',
          })
        }
      }
      i += 2
      continue
    }

    if (token === '-A' || token === '--user-agent') {
      headers.push({ name: 'User-Agent', value: tokens[i + 1] || '' })
      i += 2
      continue
    }

    if (token === '-u' || token === '--user') {
      const userPass = tokens[i + 1] || ''
      try {
        const encoded = btoa(userPass)
        headers.push({ name: 'Authorization', value: `Basic ${encoded}` })
      } catch {
        // ignore btoa error
      }
      i += 2
      continue
    }

    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii' ||
      token === '--data-urlencode'
    ) {
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
    if (
      token === '--location' ||
      token === '-L' ||
      token === '--compressed' ||
      token === '-k' ||
      token === '--insecure' ||
      token === '-s' ||
      token === '--silent' ||
      token === '-v' ||
      token === '--verbose'
    ) {
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

  // Parse URL components
  let protocol = 'https'
  let server = ''
  let port = ''
  let path = '/'

  if (url) {
    try {
      // Handle URL with or without protocol
      let urlToParse = url
      if (!/^https?:\/\//i.test(urlToParse)) {
        urlToParse = `https://${urlToParse}`
      }

      const parsedUrl = new URL(urlToParse)
      protocol = parsedUrl.protocol.replace(':', '').toLowerCase()
      server = parsedUrl.hostname
      port = parsedUrl.port || ''
      if (!body && parsedUrl.searchParams && Array.from(parsedUrl.searchParams.keys()).length > 0) {
        path = parsedUrl.pathname || '/'
        parsedUrl.searchParams.forEach((val, key) => {
          parameters.push({ name: key, value: val, encode: true })
        })
      } else {
        path = (parsedUrl.pathname + parsedUrl.search).replace(/ /g, '%20')
      }
    } catch {
      // Fallback manual regex parsing
      const urlMatch = url.match(/^(?:(https?):\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/i)
      if (urlMatch) {
        protocol = urlMatch[1] ? urlMatch[1].toLowerCase() : 'https'
        server = urlMatch[2] || ''
        port = urlMatch[3] || ''
        path = urlMatch[4] || '/'
      }
    }
  }

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

/**
 * Convert a ParsedCurl object into a JMeter HTTPRequest TestPlanNode (with optional child HTTPHeaderManager).
 */
export function convertCurlToNodes(
  parsed: ParsedCurl,
  customName?: string,
  includeHeaderManager = true,
  includeCookieManager = false,
): { samplerNode: TestPlanNode; headerNode?: TestPlanNode; cookieNode?: TestPlanNode } {
  const samplerName = customName?.trim() || parsed.suggestedName

  const samplerNode = createNode('HTTPRequest', samplerName, {
    method: parsed.method || 'GET',
    protocol: parsed.protocol || 'https',
    server: parsed.server || '',
    port: parsed.port || '',
    path: parsed.path || '/',
    contentEncoding: 'UTF-8',
    followRedirects: true,
    autoRedirects: false,
    keepAlive: true,
    multipart: false,
    browserCompatible: false,
    postBodyRaw: parsed.isRawBody,
    body: parsed.body,
    parameters: parsed.isRawBody ? [] : parsed.parameters,
    files: [],
  })

  let headerNode: TestPlanNode | undefined
  if (includeHeaderManager && parsed.headers.length > 0) {
    headerNode = createNode('HTTPHeaderManager', 'HTTP Header Manager', {
      headers: parsed.headers,
    })
    samplerNode.children.push(headerNode)
  }

  let cookieNode: TestPlanNode | undefined
  if (includeCookieManager && parsed.cookies.length > 0) {
    cookieNode = createNode('HTTPCookieManager', 'HTTP Cookie Manager', {
      cookies: parsed.cookies,
      clearEachIteration: false,
      controlledByThreadGroup: false,
    })
    samplerNode.children.push(cookieNode)
  }

  return { samplerNode, headerNode, cookieNode }
}
