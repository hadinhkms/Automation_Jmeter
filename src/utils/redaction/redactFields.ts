import type { RecordedHeader, RecordedParam } from '../../models/recorder'
import { getJMeterVariableName, isSensitiveHeader, isSensitiveKey, maskString } from './sensitiveKeys'

export function redactHeaders(
  headers: RecordedHeader[],
  mode: 'mask' | 'parameterize' | 'none',
): { headers: RecordedHeader[]; extractedVariables: Record<string, string> } {
  const extractedVariables: Record<string, string> = {}
  if (mode === 'none') {
    return { headers: [...headers], extractedVariables }
  }

  const result: RecordedHeader[] = []

  for (const h of headers) {
    if (isSensitiveHeader(h.name) || isSensitiveKey(h.name)) {
      const varName = getJMeterVariableName(h.name)
      if (mode === 'parameterize') {
        extractedVariables[varName] = h.value
        if (h.value.startsWith('Bearer ') || h.value.startsWith('bearer ')) {
          result.push({ name: h.name, value: `Bearer \${${varName}}` })
        } else if (h.value.startsWith('Basic ') || h.value.startsWith('basic ')) {
          result.push({ name: h.name, value: `Basic \${${varName}}` })
        } else {
          result.push({ name: h.name, value: `\${${varName}}` })
        }
      } else {
        result.push({ name: h.name, value: maskString(h.value) })
      }
    } else {
      result.push({ ...h })
    }
  }

  return { headers: result, extractedVariables }
}

export function redactParams(
  params: RecordedParam[],
  mode: 'mask' | 'parameterize' | 'none',
): { params: RecordedParam[]; extractedVariables: Record<string, string> } {
  const extractedVariables: Record<string, string> = {}
  if (mode === 'none') {
    return { params: [...params], extractedVariables }
  }

  const result: RecordedParam[] = []

  for (const p of params) {
    if (isSensitiveKey(p.name)) {
      const varName = getJMeterVariableName(p.name)
      if (mode === 'parameterize') {
        extractedVariables[varName] = p.value
        result.push({ ...p, value: `\${${varName}}` })
      } else {
        result.push({ ...p, value: maskString(p.value) })
      }
    } else {
      result.push({ ...p })
    }
  }

  return { params: result, extractedVariables }
}
