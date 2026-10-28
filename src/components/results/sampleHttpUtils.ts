import type { JtlSample } from '../../services/jmeterRunnerService'

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const

export function decodeUnicodeEscapes(str: string): string {
  if (!str) return ''
  return str
    .replace(/&#x0*([0-9a-fA-F]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
    .replace(/&#([0-9]+);/gi, (_, dec) => {
      const code = parseInt(dec, 10)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
    .replace(/\\u([0-9a-fA-F]{4})/gi, (_, hex) => {
      const code = parseInt(hex, 16)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
}

export function getHttpUrl(sample: JtlSample): string {
  const candidates = [
    sample.url || '',
    (sample.request || '').match(/https?:\/\/[^\s'")]+/i)?.[0] || '',
  ]

  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    if (!trimmed || trimmed === '(none)') continue

    try {
      const parsed = new URL(trimmed)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString()
      }
    } catch {
      // keep checking the next candidate
    }
  }

  return ''
}

export function isNonHttpSampler(sample: JtlSample): boolean {
  const label = sample.label.toLowerCase()
  return label.includes('debug sampler') || label.includes('jsr223')
}

export function isHttpRequestSample(sample: JtlSample): boolean {
  return !isNonHttpSampler(sample) && Boolean(getHttpUrl(sample))
}
