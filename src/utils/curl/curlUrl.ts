import type { TableRow } from '../../models/jmeter'

export interface CurlUrlParts {
  protocol: string
  server: string
  port: string
  path: string
}

/**
 * Parse URL components; query params are pushed into `parameters` when there is no body.
 */
export function parseCurlUrl(url: string, body: string, parameters: TableRow[]): CurlUrlParts {
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

  return { protocol, server, port, path }
}
