import { prop } from './domReaders'

/** Converts raw JMeter property encodings into the values used by the editor UI. */

export function assertionMatchType(element: Element): string {
  const raw = Number(prop(element, 'Assertion.test_type', '8'))
  if ((raw & 16) === 16) return 'substring'
  if ((raw & 8) === 8) return 'equals'
  if ((raw & 2) === 2) return 'contains'
  return 'matches'
}

export function sampleScopeToEditorValue(rawScope: string): string {
  const scope = rawScope.trim()
  if (scope === 'all' || scope === 'main-and-sub') return 'all'
  if (scope === 'children' || scope === 'sub') return 'children'
  if (scope === 'variable') return 'variable'
  return 'main'
}

export function regexFieldToEditorValue(rawField: string): string {
  const field = rawField.trim()
  const normalized = field.toLowerCase()

  if (!field || normalized === 'false' || normalized === 'body') return 'body'
  if (normalized === 'unescaped' || normalized === 'body-unescaped') return 'body-unescaped'
  if (normalized === 'true' || normalized === 'headers') return 'headers'
  if (normalized === 'request_headers' || normalized === 'request-headers') return 'request-headers'
  if (normalized === 'url') return 'url'
  if (normalized === 'code') return 'code'
  if (normalized === 'message') return 'message'
  if (normalized === 'as_document' || normalized === 'document') return 'document'
  return 'body'
}
