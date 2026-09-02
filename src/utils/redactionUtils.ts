import type { RecordedHeader, RecordedParam, RecordedRequest } from '../models/recorder'

const SENSITIVE_HEADER_REGEX = /^(authorization|cookie|set-cookie|x-api-key|x-csrf-token|x-xsrf-token|x-auth-token|apikey|api-key|x-token|access-token|refresh-token|bearer)$/i

const SENSITIVE_KEY_REGEX = /^(password|pwd|pass|passcode|token|access_token|accessToken|refresh_token|refreshToken|secret|client_secret|clientSecret|apikey|api_key|apiKey|otp|pin|cvv|cvv2|card_number|cardNumber|ssn|auth_token|authToken|csrf_token|csrfToken|xsrf_token|xsrfToken|jwt)$/i

export function isSensitiveHeader(name: string): boolean {
  return SENSITIVE_HEADER_REGEX.test(name.trim())
}

export function isSensitiveKey(key: string): boolean {
  const normalized = key.trim().toLowerCase().replace(/[-_]/g, '')
  if (SENSITIVE_KEY_REGEX.test(key.trim())) return true
  return (
    normalized.includes('password') ||
    normalized.includes('secret') ||
    normalized.includes('token') ||
    normalized.includes('apikey') ||
    normalized.includes('auth') ||
    normalized.includes('credential') ||
    normalized.includes('passcode') ||
    normalized.includes('pin') ||
    normalized.includes('cvv') ||
    normalized.includes('cardnumber') ||
    normalized.includes('otp') ||
    normalized.includes('jwt')
  )
}

export function getJMeterVariableName(key: string): string {
  const lower = key.toLowerCase()
  if (lower.includes('auth') || lower.includes('bearer')) return 'AUTH_TOKEN'
  if (lower.includes('pass') || lower.includes('pwd')) return 'PASSWORD'
  if (lower.includes('csrf') || lower.includes('xsrf')) return 'CSRF_TOKEN'
  if (lower.includes('refresh')) return 'REFRESH_TOKEN'
  if (lower.includes('access')) return 'ACCESS_TOKEN'
  if (lower.includes('api') && lower.includes('key')) return 'API_KEY'
  if (lower.includes('secret')) return 'CLIENT_SECRET'
  if (lower.includes('otp') || lower.includes('pin') || lower.includes('passcode')) return 'OTP_CODE'
  if (lower.includes('card') || lower.includes('cvv')) return 'CARD_NUMBER'
  if (lower.includes('jwt')) return 'JWT_TOKEN'
  
  const clean = key.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/^_+|_+$/g, '')
  return clean || 'SECRET_VAL'
}

export function maskString(val: string): string {
  if (!val) return ''
  if (val.startsWith('Bearer ') || val.startsWith('bearer ')) {
    return 'Bearer **********'
  }
  if (val.startsWith('Basic ') || val.startsWith('basic ')) {
    return 'Basic **********'
  }
  if (val.length <= 4) return '****'
  return '**********'
}

export function detectSensitiveInRequest(req: RecordedRequest): {
  hasSensitive: boolean
  fields: string[]
} {
  const fields: string[] = []

  for (const h of req.requestHeaders) {
    if (isSensitiveHeader(h.name) || isSensitiveKey(h.name)) {
      fields.push(`Header: ${h.name}`)
    }
  }

  if (req.queryParams) {
    for (const p of req.queryParams) {
      if (isSensitiveKey(p.name)) fields.push(`Query: ${p.name}`)
    }
  }

  if (req.postParams) {
    for (const p of req.postParams) {
      if (isSensitiveKey(p.name)) fields.push(`BodyParam: ${p.name}`)
    }
  }

  if (req.postData) {
    try {
      const parsed = JSON.parse(req.postData)
      const scanObject = (obj: unknown) => {
        if (!obj || typeof obj !== 'object') return
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (isSensitiveKey(k)) fields.push(`JSON: ${k}`)
          if (typeof v === 'object') scanObject(v)
        }
      }
      scanObject(parsed)
    } catch {
      // urlencoded string check
      if (req.postData.includes('=')) {
        const pairs = req.postData.split('&')
        for (const pair of pairs) {
          const [k] = pair.split('=')
          if (k && isSensitiveKey(decodeURIComponent(k))) {
            fields.push(`Form: ${decodeURIComponent(k)}`)
          }
        }
      }
    }
  }

  return {
    hasSensitive: fields.length > 0,
    fields,
  }
}

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

export function redactBodyContent(
  bodyStr: string,
  mode: 'mask' | 'parameterize' | 'none',
): { body: string; extractedVariables: Record<string, string> } {
  const extractedVariables: Record<string, string> = {}
  if (!bodyStr || mode === 'none') {
    return { body: bodyStr, extractedVariables }
  }

  const trimmed = bodyStr.trim()

  // 1. JSON Body
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed)
      const transform = (obj: unknown): unknown => {
        if (!obj || typeof obj !== 'object') return obj
        if (Array.isArray(obj)) return obj.map(transform)

        const output: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          if (isSensitiveKey(key) && typeof value === 'string') {
            const varName = getJMeterVariableName(key)
            if (mode === 'parameterize') {
              extractedVariables[varName] = value
              output[key] = `\${${varName}}`
            } else {
              output[key] = maskString(value)
            }
          } else if (typeof value === 'object') {
            output[key] = transform(value)
          } else {
            output[key] = value
          }
        }
        return output
      }

      const redactedJson = transform(parsed)
      return {
        body: JSON.stringify(redactedJson, null, 2),
        extractedVariables,
      }
    } catch {
      // Fallback
    }
  }

  // 2. Form URL-encoded
  if (trimmed.includes('=') && !trimmed.includes('\n')) {
    try {
      const pairs = trimmed.split('&')
      const updatedPairs: string[] = []
      for (const pair of pairs) {
        const [rawKey, rawVal] = pair.split('=')
        if (rawKey !== undefined) {
          const key = decodeURIComponent(rawKey)
          const val = rawVal !== undefined ? decodeURIComponent(rawVal) : ''
          if (isSensitiveKey(key)) {
            const varName = getJMeterVariableName(key)
            if (mode === 'parameterize') {
              extractedVariables[varName] = val
              updatedPairs.push(`${encodeURIComponent(key)}=\${${varName}}`)
            } else {
              updatedPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(maskString(val))}`)
            }
          } else {
            updatedPairs.push(pair)
          }
        }
      }
      return { body: updatedPairs.join('&'), extractedVariables }
    } catch {
      // Fallback
    }
  }

  return { body: bodyStr, extractedVariables }
}
