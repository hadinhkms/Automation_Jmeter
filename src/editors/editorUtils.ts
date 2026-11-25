import { isJmeterExpression } from '../jmx/parse/domReaders'
import type { TableRow, TestPlanNode } from '../models/jmeter'

export interface EditorProps {
  node: TestPlanNode
  updateProperties: (updates: Record<string, unknown>) => void
}

export const textProp = (node: TestPlanNode, key: string, fallback = ''): string => {
  const value = node.properties[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
}

export const numberProp = (node: TestPlanNode, key: string, fallback = 0): number => {
  const value = Number(node.properties[key])
  return Number.isFinite(value) ? value : fallback
}

/** Converts a count input (loops, …) to a stored value: a number, or a `${var}` expression kept as text. */
export const countInput = (value: string): number | string => {
  const trimmed = value.trim()
  if (trimmed === '' || isJmeterExpression(trimmed)) return trimmed
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : value
}

/** Inline validation for count fields that accept either a number ≥ min or a `${var}` expression. */
export const countError = (raw: string, min = 1): string | undefined => {
  const trimmed = raw.trim()
  if (isJmeterExpression(trimmed)) return undefined
  const parsed = Number(trimmed)
  if (trimmed === '' || !Number.isFinite(parsed)) return 'Enter a number or ${variable}'
  return parsed < min ? `Must be at least ${min}` : undefined
}

export const boolProp = (node: TestPlanNode, key: string, fallback = false): boolean => {
  const value = node.properties[key]
  return typeof value === 'boolean' ? value : fallback
}

export const rowsProp = (node: TestPlanNode, key: string): TableRow[] => {
  const value = node.properties[key]
  // SAFETY: Array.isArray checked; editors always store these table rows as TableRow objects
  return Array.isArray(value) ? (value as TableRow[]) : []
}
