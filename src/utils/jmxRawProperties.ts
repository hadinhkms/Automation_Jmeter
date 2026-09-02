import type { TableRow } from '../models/jmeter'

const PROPERTY_TAGS = new Set([
  'stringProp',
  'boolProp',
  'intProp',
  'longProp',
  'floatProp',
  'doubleProp',
])

function parseXml(rawXml: string): XMLDocument | null {
  if (!rawXml.trim()) return null
  const doc = new DOMParser().parseFromString(rawXml, 'application/xml')
  return doc.querySelector('parsererror') ? null : doc
}

function elementPath(root: Element, target: Element): string {
  const indexes: number[] = []
  let current: Element | null = target

  while (current && current !== root) {
    const parent: Element | null = current.parentElement
    if (!parent) break
    indexes.unshift(Array.from(parent.children).indexOf(current))
    current = parent
  }

  return indexes.join('.')
}

export function parseRawJmxProperties(rawXml: string): TableRow[] {
  const doc = parseXml(rawXml)
  const root = doc?.documentElement
  if (!root) return []

  return Array.from(root.querySelectorAll('*'))
    .filter((element) => PROPERTY_TAGS.has(element.tagName))
    .map((element) => ({
      rawPath: elementPath(root, element),
      type: element.tagName,
      name: element.getAttribute('name') || '',
      value: element.textContent || '',
    }))
}

export function applyRawJmxProperties(rawXml: string, rows: TableRow[]): string {
  const doc = parseXml(rawXml)
  const root = doc?.documentElement
  if (!doc || !root) return rawXml

  const existingRowsByPath = new Map(
    rows
      .filter((row) => typeof row.rawPath === 'string' && row.rawPath)
      .map((row) => [String(row.rawPath), row]),
  )

  for (const element of Array.from(root.querySelectorAll('*'))) {
    if (!PROPERTY_TAGS.has(element.tagName)) continue
    const path = elementPath(root, element)
    const row = existingRowsByPath.get(path)
    if (!row) {
      element.remove()
      continue
    }
    element.setAttribute('name', String(row.name || ''))
    element.textContent = String(row.value ?? '')
  }

  rows
    .filter((row) => !row.rawPath)
    .forEach((row) => {
      const type = PROPERTY_TAGS.has(String(row.type)) ? String(row.type) : 'stringProp'
      const element = doc.createElement(type)
      element.setAttribute('name', String(row.name || ''))
      element.textContent = String(row.value ?? '')
      root.appendChild(element)
    })

  return new XMLSerializer().serializeToString(root)
}
