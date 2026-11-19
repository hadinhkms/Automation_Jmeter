import type { JtlSample } from '../../services/jmeterRunnerService'
import type { ParsedJtlResult } from '../../models/jtl'

function unescapeXmlText(str: string): string {
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

export function parseXmlJtl(xml: string): ParsedJtlResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const httpSamples = Array.from(doc.querySelectorAll('httpSample, sample'))

  const samples: JtlSample[] = httpSamples.map((el, i) => {
    const label = unescapeXmlText(el.getAttribute('lb') || `Sample ${i + 1}`)
    const code = Number(el.getAttribute('rc')) || 200
    const elapsed = Number(el.getAttribute('t')) || 0
    const success = el.getAttribute('s') === 'true'
    const threadName = unescapeXmlText(el.getAttribute('tn') || 'Thread Group 1-1')
    const bytes = Number(el.getAttribute('by')) || 0
    const latency = Number(el.getAttribute('lt')) || 0
    const connectTime = Number(el.getAttribute('ct')) || 0
    const timestampRaw = Number(el.getAttribute('ts')) || Date.now()
    const timestamp = new Date(timestampRaw).toLocaleTimeString()
    const responseData = unescapeXmlText(el.querySelector('responseData')?.textContent || '')
    const samplerData = unescapeXmlText(el.querySelector('samplerData')?.textContent || '')
    const requestHeader = unescapeXmlText(el.querySelector('requestHeader')?.textContent || '')
    const responseHeader = unescapeXmlText(el.querySelector('responseHeader')?.textContent || '')
    const method = el.querySelector('method')?.textContent?.toUpperCase() || 'HTTP'
    const url = unescapeXmlText(el.querySelector('java\\.net\\.URL')?.textContent || '')
    const queryString = unescapeXmlText(el.querySelector('queryString')?.textContent || '')

    let requestContent = ''
    if (samplerData) {
      requestContent = samplerData
    } else if (queryString) {
      requestContent = queryString
    } else if (requestHeader) {
      requestContent = `${method} ${url}\n${requestHeader}`
    } else {
      requestContent = `Thread: ${threadName}\nURL: ${url}`
    }

    return {
      id: `sample-${i + 1}`,
      label,
      code,
      elapsed,
      success,
      method,
      url,
      request: requestContent,
      response: responseData || `Status: ${code} ${success ? 'OK' : 'Error'}\nLatency: ${latency}ms\nBytes: ${bytes}`,
      threadName,
      timestamp,
      bytes,
      sentBytes: 0,
      latency,
      connectTime,
      requestHeaders: requestHeader || undefined,
      responseHeaders: responseHeader || undefined,
    }
  })

  return {
    samples,
    summaryRows: [],
    aggregateRows: [],
    errorRate: samples.length > 0 ? (samples.filter((s) => !s.success).length / samples.length) * 100 : 0,
    totalSamples: samples.length,
  }
}
