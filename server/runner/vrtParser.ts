import { existsSync, readFileSync } from 'node:fs'
import type { JtlSample } from './types'

function unescapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&#x0*([0-9a-fA-F]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
    .replace(/&#0*([0-9]+);/g, (_, dec) => {
      const code = parseInt(dec, 10)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\r\r\n/g, '\r\n')
    .replace(/\r(?!\n)/g, '\n')
}

function parseVrtSample(tagAttrs: string, inner: string): Partial<JtlSample> {
  const lbMatch = tagAttrs.match(/\blb="([^"]*)"/)
  const rcMatch = tagAttrs.match(/\brc="([^"]*)"/)
  const sMatch = tagAttrs.match(/\bs="([^"]*)"/)
  const tMatch = tagAttrs.match(/\bt="([^"]*)"/)
  const tnMatch = tagAttrs.match(/\btn="([^"]*)"/)
  const byMatch = tagAttrs.match(/\bby="([^"]*)"/)
  const sbyMatch = tagAttrs.match(/\bsby="([^"]*)"/)
  const ltMatch = tagAttrs.match(/\blt="([^"]*)"/)
  const ctMatch = tagAttrs.match(/\bct="([^"]*)"/)
  const tsMatch = tagAttrs.match(/\bts="([^"]*)"/)

  const responseDataMatch = inner.match(/<responseData[^>]*>([\s\S]*?)<\/responseData>/)
  const requestHeaderMatch = inner.match(/<requestHeader[^>]*>([\s\S]*?)<\/requestHeader>/)
  const responseHeaderMatch = inner.match(/<responseHeader[^>]*>([\s\S]*?)<\/responseHeader>/)
  const samplerDataMatch = inner.match(/<samplerData[^>]*>([\s\S]*?)<\/samplerData>/)
  const methodMatch = inner.match(/<method[^>]*>([\s\S]*?)<\/method>/)
  const urlMatch = inner.match(/<java\.net\.URL>([\s\S]*?)<\/java\.net\.URL>/)
  const queryMatch = inner.match(/<queryString[^>]*>([\s\S]*?)<\/queryString>/)

  const responseData = responseDataMatch ? unescapeXml(responseDataMatch[1].trim()) : ''
  const requestHeader = requestHeaderMatch ? unescapeXml(requestHeaderMatch[1].trim()) : ''
  const responseHeader = responseHeaderMatch ? unescapeXml(responseHeaderMatch[1].trim()) : ''
  const samplerData = samplerDataMatch ? unescapeXml(samplerDataMatch[1].trim()) : ''
  const method = methodMatch ? methodMatch[1].trim().toUpperCase() : ''
  const url = urlMatch ? unescapeXml(urlMatch[1].trim()) : ''
  const queryString = queryMatch ? unescapeXml(queryMatch[1].trim()) : ''

  let requestContent = ''
  if (samplerData) {
    requestContent = samplerData
  } else if (queryString) {
    requestContent = queryString
  } else if (requestHeader) {
    requestContent = `${method || 'GET'} ${url}\n${requestHeader}`
  }

  return {
    label: lbMatch ? unescapeXml(lbMatch[1]) : undefined,
    code: rcMatch ? Number(rcMatch[1]) : undefined,
    elapsed: tMatch ? Number(tMatch[1]) : undefined,
    success: sMatch ? sMatch[1] === 'true' : undefined,
    threadName: tnMatch ? unescapeXml(tnMatch[1]) : undefined,
    bytes: byMatch ? Number(byMatch[1]) : undefined,
    sentBytes: sbyMatch ? Number(sbyMatch[1]) : undefined,
    latency: ltMatch ? Number(ltMatch[1]) : undefined,
    connectTime: ctMatch ? Number(ctMatch[1]) : undefined,
    timestamp: tsMatch ? new Date(Number(tsMatch[1])).toLocaleTimeString() : undefined,
    method: method || 'HTTP',
    url: url || undefined,
    request: requestContent || undefined,
    response: responseData || undefined,
    requestHeaders: requestHeader || undefined,
    responseHeaders: responseHeader || undefined,
  }
}

export function parseVrtXml(vrtPath: string): Map<string | number, Partial<JtlSample>> {
  const result = new Map<string | number, Partial<JtlSample>>()
  if (!existsSync(vrtPath)) return result

  try {
    const content = readFileSync(vrtPath, 'utf-8')
    const tagOpenRegex = /<(httpSample|sample)\s+([^>]+)>/g
    let m: RegExpExecArray | null
    const openings: { attrs: string; contentStart: number; nextIndex: number }[] = []
    while ((m = tagOpenRegex.exec(content)) !== null) {
      openings.push({ attrs: m[2], contentStart: m.index + m[0].length, nextIndex: m.index })
    }

    for (let i = 0; i < openings.length; i++) {
      const cur = openings[i]
      const nextStart = i + 1 < openings.length ? openings[i + 1].nextIndex : content.length
      const inner = content.substring(cur.contentStart, nextStart)
      const tagAttrs = cur.attrs
      const sampleObj = parseVrtSample(tagAttrs, inner)

      const sampleIdx = i + 1
      result.set(sampleIdx, sampleObj)
      const tsMatch = tagAttrs.match(/\bts="([^"]*)"/)
      const lbMatch = tagAttrs.match(/\blb="([^"]*)"/)
      const tsVal = tsMatch ? tsMatch[1] : ''
      const lbVal = lbMatch ? unescapeXml(lbMatch[1]) : ''
      if (tsVal) {
        result.set(`${tsVal}_${lbVal}`, sampleObj)
        if (!result.has(tsVal)) {
          result.set(tsVal, sampleObj)
        }
      }
    }
  } catch (err) {
    console.error('Error parsing vrt_results.xml:', err)
  }

  return result
}
