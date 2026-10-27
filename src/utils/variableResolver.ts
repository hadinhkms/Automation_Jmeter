import type { TestPlanNode } from '../models/jmeter'

/**
 * Iteratively resolves nested variable references inside a dictionary of variables
 * (e.g. { envi: 'qc', host: 'mr.${envi}.com' } -> { envi: 'qc', host: 'mr.qc.com' })
 */
export function resolveVariableMap(rawVars: Record<string, string>): Record<string, string> {
  const resolved = { ...rawVars }
  for (let pass = 0; pass < 5; pass++) {
    let changed = false
    for (const [key, val] of Object.entries(resolved)) {
      if (typeof val === 'string' && val.includes('${')) {
        const next = val.replace(/\$\{([^}]+)\}/g, (match, vName) => {
          const trimmed = vName.trim()
          if (resolved[trimmed] !== undefined && trimmed !== key) {
            changed = true
            return resolved[trimmed]
          }
          return match
        })
        if (next !== val) {
          resolved[key] = next
        }
      }
    }
    if (!changed) break
  }
  return resolved
}

/**
 * Replaces all occurrences of ${varName} in a string using the provided variable dictionary.
 * Supports up to 5 passes for nested expressions and basic ${__P(key, default)} JMeter properties.
 */
export function resolveVariables(text: string, variables?: Record<string, string>): string {
  if (!text || typeof text !== 'string' || !variables) return text || ''
  let result = text
  for (let pass = 0; pass < 5; pass++) {
    let replaced = false
    result = result.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const trimmed = varName.trim()
      if (variables[trimmed] !== undefined && variables[trimmed] !== null) {
        replaced = true
        return variables[trimmed]
      }
      const propMatch = trimmed.match(/^__(?:P|property)\(([^,)]+)(?:,([^)]*))?\)$/)
      if (propMatch) {
        const pKey = propMatch[1].trim()
        const pDefault = propMatch[2] !== undefined ? propMatch[2].trim() : ''
        if (variables[pKey] !== undefined) {
          replaced = true
          return variables[pKey]
        }
        if (pDefault) {
          replaced = true
          return pDefault
        }
      }
      return match
    })
    if (!replaced) break
  }
  return result
}

// Re-export for backward compatibility
export { collectKnownVariables } from './variableCollector'

