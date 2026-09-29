import type { TableRow } from '../../models/jmeter'

export interface PostmanEnvVariable {
  key: string
  value: string
  enabled: boolean
  type?: string
}

export interface ParsedEnvironment {
  id: string
  name: string
  variables: PostmanEnvVariable[]
}

export function parsePostmanEnvironment(jsonString: string): {
  environment: ParsedEnvironment | null
  error?: string
} {
  try {
    const data = JSON.parse(jsonString)
    if (!data || typeof data !== 'object') {
      return { environment: null, error: 'File is not a valid JSON object.' }
    }

    const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Imported Environment'
    const id = typeof data.id === 'string' && data.id ? data.id : `env_${Date.now()}`
    const rawValues = Array.isArray(data.values) ? data.values : []

    const variables: PostmanEnvVariable[] = []
    for (const item of rawValues) {
      if (item && typeof item === 'object' && typeof item.key === 'string' && item.key.trim()) {
        variables.push({
          key: item.key.trim(),
          value: item.value !== undefined && item.value !== null ? String(item.value) : '',
          enabled: item.enabled !== false,
          type: typeof item.type === 'string' ? item.type : 'default',
        })
      }
    }

    // Fallback: If not Postman standard values array, check if it's a flat key-value dictionary
    if (variables.length === 0 && !Array.isArray(data.values)) {
      for (const [key, val] of Object.entries(data)) {
        if (key !== 'id' && key !== 'name' && key !== '_postman_variable_scope') {
          variables.push({
            key,
            value: String(val ?? ''),
            enabled: true,
          })
        }
      }
    }

    return {
      environment: {
        id,
        name,
        variables,
      },
    }
  } catch (err: unknown) {
    return {
      environment: null,
      error: `Failed to parse environment JSON: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export function convertEnvToUDVRows(variables: PostmanEnvVariable[]): TableRow[] {
  return variables
    .filter((v) => v.enabled && v.key.trim())
    .map((v) => ({
      name: v.key.trim(),
      value: v.value,
      description: 'Imported from Postman Environment',
    }))
}
