import type { JtlSample } from '../../../services/jmeterRunnerService'
import type { TestPlanNode } from '../../../models/jmeter'
import { resolveVariables } from '../../../utils/variableResolver'
import { findSamplerHeadersInTestPlan } from '../testPlanSamplerLookup'
import { decodeUnicodeEscapes, isHttpRequestSample } from '../sampleHttpUtils'
import type { HeaderEntry, UrlInfo } from './types'

// Request Headers
export function buildRequestHeaders(
  selectedSample: JtlSample,
  urlInfo: UrlInfo | null,
  testPlan: TestPlanNode,
  vars: Record<string, string>
): string {
  if (!isHttpRequestSample(selectedSample)) {
    return '(This sampler does not generate HTTP request headers)'
  }
  if (selectedSample.requestHeaders && selectedSample.requestHeaders.trim()) {
    const decoded = decodeUnicodeEscapes(selectedSample.requestHeaders.trim())
    return vars ? resolveVariables(decoded, vars) : decoded
  }
  if (testPlan) {
    const planHeaders = findSamplerHeadersInTestPlan(testPlan, selectedSample.label)
    if (planHeaders.length > 0) {
      return planHeaders
        .map((h) => {
          const name = vars ? resolveVariables(h.name, vars) : h.name
          const val = vars ? resolveVariables(h.value, vars) : h.value
          return `${name}: ${val}`
        })
        .join('\n')
    }
  }
  const rawReq = selectedSample.request || ''
  // Only parse headers from rawReq if it doesn't look like a multipart body or JSON body
  if (!rawReq.startsWith('--') && !rawReq.trim().startsWith('{') && !rawReq.trim().startsWith('[')) {
    const lines = rawReq.split(/\r?\n/)
    const headerLines: string[] = []
    for (const line of lines) {
      if (/^[A-Za-z0-9-]+:\s*.+/.test(line)) {
        headerLines.push(vars ? resolveVariables(line, vars) : line)
      }
    }
    if (headerLines.length > 0) return decodeUnicodeEscapes(headerLines.join('\n'))
  }

  return `Connection: keep-alive\nContent-Type: application/json; charset=UTF-8\nAccept: application/json, text/plain, */*\nUser-Agent: Apache-JMeter/5.6.3\nHost: ${urlInfo?.host || 'localhost'}`
}

export function parseResponseHeadersList(formattedResponseHeaders: string): HeaderEntry[] {
  const lines = formattedResponseHeaders.split(/\r?\n/)
  const list: HeaderEntry[] = []
  for (const line of lines) {
    if (line.startsWith('HTTP/1.')) continue
    const idx = line.indexOf(':')
    if (idx > 0) {
      list.push({
        name: line.substring(0, idx).trim(),
        value: line.substring(idx + 1).trim(),
      })
    }
  }
  return list
}

// Detailed Response Headers
export function buildFormattedResponseHeaders(selectedSample: JtlSample): string {
  if (selectedSample.responseHeaders && selectedSample.responseHeaders.trim()) {
    return decodeUnicodeEscapes(selectedSample.responseHeaders.trim())
  }
  const isDebug = selectedSample.label.toLowerCase().includes('debug sampler')
  if (isDebug) {
    return `HTTP/1.1 200 OK\nContentType: text/plain; charset=UTF-8\nContent-Length: ${selectedSample.bytes || 320}\nDataEncoding: UTF-8`
  }
  const statusText = selectedSample.success ? 'OK' : 'Internal Server Error / Failed'
  return [
    `HTTP/1.1 ${selectedSample.code} ${statusText}`,
    `Server: Apache-Coyote/1.1`,
    `Content-Type: application/json;charset=UTF-8`,
    `Content-Length: ${selectedSample.bytes || (selectedSample.response ? selectedSample.response.length : 0)}`,
    `Date: ${new Date().toUTCString()}`,
    `X-Response-Time: ${selectedSample.elapsed}ms`,
    `X-Connect-Time: ${selectedSample.connectTime || 0}ms`,
    `X-Latency: ${selectedSample.latency || 0}ms`,
  ].join('\n')
}
