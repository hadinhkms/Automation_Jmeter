function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function evaluateDynamicVariable(varName: string): string | null {
  const normalized = varName.trim().toLowerCase()
  switch (normalized) {
    case '$guid':
      return generateUUID()
    case '$timestamp':
      return Math.floor(Date.now() / 1000).toString()
    case '$isotimestamp':
      return new Date().toISOString()
    case '$randomint':
      return Math.floor(Math.random() * 1000).toString()
    default:
      return null
  }
}

/**
 * Resolves Postman dynamic variables and active environment variables in a text string.
 */
export function resolveVariables(template: string, envVars: Record<string, string> = {}): string {
  if (!template) return ''

  return template.replace(/\{\{\s*([$a-zA-Z0-9_.-]+)\s*\}\}/g, (match, varName) => {
    const dynamicVal = evaluateDynamicVariable(varName)
    if (dynamicVal !== null) return dynamicVal

    if (Object.prototype.hasOwnProperty.call(envVars, varName)) {
      return envVars[varName]
    }

    return match
  })
}

/**
 * Transpiles Postman dynamic and custom variables into Apache JMeter native syntax.
 */
export function transpileVariablesToJMeter(template: string): string {
  if (!template) return ''

  let result = template
    .replace(/\{\{\s*\$guid\s*\}\}/gi, '${__UUID()}')
    .replace(/\{\{\s*\$timestamp\s*\}\}/gi, '${__time()}')
    .replace(/\{\{\s*\$randomint\s*\}\}/gi, '${__Random(1,1000)}')
    .replace(/\{\{\s*\$isotimestamp\s*\}\}/gi, "${__time(yyyy-MM-dd'T'HH:mm:ss.SSS'Z')}")

  result = result.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, '${$1}')
  return result
}
