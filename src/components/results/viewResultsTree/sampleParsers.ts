import type { JtlSample } from '../../../services/jmeterRunnerService'
import { resolveVariables } from '../../../utils/variableResolver'
import { decodeUnicodeEscapes } from '../sampleHttpUtils'
import type { UrlInfo } from './types'

export interface SampleFilterOptions {
  searchQuery: string
  caseSensitive: boolean
  isRegexp: boolean
  filterErrorsOnly: boolean
  filterSuccessOnly: boolean
}

export function filterSamples(samples: JtlSample[], o: SampleFilterOptions): JtlSample[] {
  const { searchQuery, caseSensitive, isRegexp, filterErrorsOnly, filterSuccessOnly } = o
  return samples.filter((s) => {
    if (filterErrorsOnly && s.success) return false
    if (filterSuccessOnly && !s.success) return false

    if (!searchQuery.trim()) return true

    try {
      if (isRegexp) {
        const reg = new RegExp(searchQuery, caseSensitive ? undefined : 'i')
        return reg.test(s.label) || reg.test(s.url || '') || reg.test(s.request || '') || reg.test(s.response || '')
      }
      const q = caseSensitive ? searchQuery : searchQuery.toLowerCase()
      const label = caseSensitive ? s.label : s.label.toLowerCase()
      const url = caseSensitive ? s.url || '' : (s.url || '').toLowerCase()
      return label.includes(q) || url.includes(q)
    } catch {
      return true
    }
  })
}

export function extractDebugVariables(samples: JtlSample[]): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const s of samples) {
    if (s.response && (s.label.toLowerCase().includes('debug sampler') || s.response.includes('JMeterVariables:'))) {
      const lines = s.response.split(/\r?\n/)
      for (const line of lines) {
        const eqIdx = line.indexOf('=')
        if (eqIdx > 0 && !line.startsWith('DebugSampler.')) {
          const k = line.substring(0, eqIdx).trim()
          const v = line.substring(eqIdx + 1).trim()
          if (k && v) vars[k] = v
        }
      }
    }
  }
  return vars
}

// Parse URL components for request tab
export function parseUrlInfo(selectedHttpUrl: string): UrlInfo | null {
  if (!selectedHttpUrl) return null
  try {
    const u = new URL(selectedHttpUrl)
    const params: { key: string; value: string }[] = []
    u.searchParams.forEach((value, key) => {
      params.push({ key, value })
    })
    return {
      protocol: u.protocol,
      host: u.host,
      pathname: u.pathname,
      params,
    }
  } catch {
    return null
  }
}

// Extract and format request body with variable resolution
export function formatRequestBody(selectedSample: JtlSample, vars: Record<string, string>): string {
  const raw = selectedSample.request || ''
  let formattedBody = raw
  if (raw && (raw.trim().startsWith('{') || raw.trim().startsWith('['))) {
    try {
      const parsed = JSON.parse(raw)
      formattedBody = JSON.stringify(parsed, null, 2)
    } catch {
      formattedBody = decodeUnicodeEscapes(raw)
    }
  } else {
    formattedBody = decodeUnicodeEscapes(raw)
  }

  if (vars && formattedBody) {
    formattedBody = resolveVariables(formattedBody, vars)
  }

  return formattedBody
}
