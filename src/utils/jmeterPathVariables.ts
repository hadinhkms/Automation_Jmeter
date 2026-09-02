import type { TableRow, TestPlanNode } from '../models/jmeter'

export const JMETER_BASE_DIR_EXPRESSION = '${__groovy(org.apache.jmeter.services.FileServer.getFileServer().getBaseDir())}'

const DYNAMIC_DIRECTORY_VARIABLES: Record<string, string> = {
  downloaddir: `${JMETER_BASE_DIR_EXPRESSION}/downloads`,
  folderdata: `${JMETER_BASE_DIR_EXPRESSION}/data`,
  datafolder: `${JMETER_BASE_DIR_EXPRESSION}/data/`,
  foldergpkd: JMETER_BASE_DIR_EXPRESSION,
}

export function dynamicDirectoryVariableValue(name: unknown): string | null {
  if (typeof name !== 'string') return null
  return DYNAMIC_DIRECTORY_VARIABLES[name.trim().toLowerCase()] ?? null
}

export function normalizeDirectoryVariableRows(rows: TableRow[]): TableRow[] {
  let changed = false
  const normalizedRows = rows.map((row) => {
    const dynamicValue = dynamicDirectoryVariableValue(row.name)
    if (!dynamicValue || row.value === dynamicValue) return row
    changed = true
    return { ...row, value: dynamicValue }
  })

  return changed ? normalizedRows : rows
}

export function normalizeDirectoryVariablesInTree(node: TestPlanNode): TestPlanNode {
  const originalVariables = node.properties.variables
  const variables = Array.isArray(originalVariables)
    ? normalizeDirectoryVariableRows(node.properties.variables as TableRow[])
    : undefined
  const children = node.children.map(normalizeDirectoryVariablesInTree)
  const variablesChanged = Boolean(variables && variables !== originalVariables)
  const childrenChanged = children.some((child, index) => child !== node.children[index])

  if (!variablesChanged && !childrenChanged) return node

  return {
    ...node,
    properties: variablesChanged ? { ...node.properties, variables } : node.properties,
    children,
  }
}
