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
