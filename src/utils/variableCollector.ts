import type { TestPlanNode } from '../models/jmeter'
import { resolveVariableMap } from './variableResolver'

/**
 * Collects all variables from:
 * 1. Root TestPlan properties.variables
 * 2. Child UserDefinedVariables components in TestPlan
 * 3. Active Environment variables
 * 4. Runtime Debug / Sample extracted variables
 * 5. Common JMeter built-in directory/workspace variables
 */
export function collectKnownVariables(
  testPlan: TestPlanNode | null | undefined,
  envVars: Record<string, string> | undefined,
  runtimeDebugVars: Record<string, string> | undefined
): Record<string, string> {
  const raw: Record<string, string> = {
    workspaceRoot: 'D:/_Jmeter',
    folderGPKD: 'D:/_Jmeter',
    folderdata: 'D:/_Jmeter/data',
    datafolder: 'D:/_Jmeter/data/',
    downloadDir: 'D:/_Jmeter/downloads',
  }

  // 1. Root TestPlan variables
  if (testPlan?.properties?.variables && Array.isArray(testPlan.properties.variables)) {
    for (const row of testPlan.properties.variables as { name?: unknown; value?: unknown }[]) {
      const key = typeof row?.name === 'string' ? row.name.trim() : ''
      if (key) {
        raw[key] = row.value !== undefined && row.value !== null ? String(row.value) : ''
      }
    }
  }

  // 2. Child UserDefinedVariables nodes
  if (testPlan) {
    const walk = (node: TestPlanNode) => {
      if (node.type === 'UserDefinedVariables' && node.enabled !== false && Array.isArray(node.properties?.variables)) {
        for (const row of node.properties.variables as { name?: unknown; value?: unknown }[]) {
          const key = typeof row?.name === 'string' ? row.name.trim() : ''
          if (key) {
            raw[key] = row.value !== undefined && row.value !== null ? String(row.value) : ''
          }
        }
      }
      if (node.children) {
        for (const child of node.children) {
          walk(child)
        }
      }
    }
    walk(testPlan)
  }

  // 3. Active Environment variables (override plan variables)
  if (envVars) {
    for (const [k, v] of Object.entries(envVars)) {
      const trimmed = k.trim()
      if (trimmed) {
        raw[trimmed] = v !== undefined && v !== null ? String(v) : ''
      }
    }
  }

  // 4. Runtime Debug / Sample variables (highest priority)
  if (runtimeDebugVars) {
    for (const [k, v] of Object.entries(runtimeDebugVars)) {
      const trimmed = k.trim()
      if (trimmed) {
        raw[trimmed] = v !== undefined && v !== null ? String(v) : ''
      }
    }
  }

  return resolveVariableMap(raw)
}
