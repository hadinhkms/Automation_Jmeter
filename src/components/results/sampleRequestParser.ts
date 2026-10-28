import type { JtlSample } from '../../services/jmeterRunnerService'
import { resolveVariables } from '../../utils/variableResolver'
import { decodeUnicodeEscapes } from './sampleHttpUtils'
import { extractBodyFromSamplerData } from './samplerDataBody'
import { isValidHeaderName } from './curlFormatting'

export interface ParsedSampleRequest {
  headers: { name: string; value: string }[]
  body: string
}

/** Split a sample's recorded request (requestHeaders + samplerData, or a combined dump) into headers and body. */
export function parseSampleRequest(sample: JtlSample, knownVariables?: Record<string, string>): ParsedSampleRequest {
  const headers: { name: string; value: string }[] = []
  let body = ''

  if (sample.requestHeaders && sample.requestHeaders.trim()) {
    const lines = decodeUnicodeEscapes(sample.requestHeaders.trim()).split(/\r?\n/)
    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        let name = line.substring(0, colonIdx).trim()
        let val = line.substring(colonIdx + 1).trim()
        const lowerName = name.toLowerCase()
        if (lowerName !== 'connection' && lowerName !== 'content-length' && lowerName !== 'host') {
          if (knownVariables) {
            name = resolveVariables(name, knownVariables)
            val = resolveVariables(val, knownVariables)
          }
          headers.push({ name, value: val })
        }
      }
    }
    body = extractBodyFromSamplerData(decodeUnicodeEscapes(sample.request || ''))
  } else {
    const rawReq = decodeUnicodeEscapes(sample.request || '')
    const lines = rawReq.split(/\r?\n/)
    let inBody = false
    const bodyLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (inBody) {
        bodyLines.push(line)
        continue
      }

      if (!line.trim()) {
        if (i > 0) inBody = true
        continue
      }

      if (line.trim().startsWith('{') || line.trim().startsWith('[')) {
        inBody = true
        bodyLines.push(line)
        continue
      }

      if (line.startsWith('Body:')) {
        inBody = true
        bodyLines.push(line.replace(/^Body:\s*/i, ''))
        continue
      }

      const colonIdx = line.indexOf(':')
      // isValidHeaderName also skips the request line ("GET https://..."), whose "name" contains a space
      if (colonIdx > 0 && isValidHeaderName(line.substring(0, colonIdx).trim()) && !line.startsWith('URL:') && !line.startsWith('Method:') && !line.startsWith('Thread:')) {
        let name = line.substring(0, colonIdx).trim()
        let val = line.substring(colonIdx + 1).trim()
        const lowerName = name.toLowerCase()
        if (lowerName !== 'connection' && lowerName !== 'content-length' && lowerName !== 'host') {
          if (knownVariables) {
            name = resolveVariables(name, knownVariables)
            val = resolveVariables(val, knownVariables)
          }
          headers.push({ name, value: val })
        }
      }
    }

    if (bodyLines.length > 0) {
      body = extractBodyFromSamplerData(bodyLines.join('\n'))
    }
  }

  return { headers, body }
}
