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

export const boolProp = (node: TestPlanNode, key: string, fallback = false): boolean => {
  const value = node.properties[key]
  return typeof value === 'boolean' ? value : fallback
}

export const rowsProp = (node: TestPlanNode, key: string): TableRow[] => {
  const value = node.properties[key]
  return Array.isArray(value) ? (value as TableRow[]) : []
}
