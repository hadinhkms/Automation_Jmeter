import type { TableRow } from '../../models/jmeter'

/** Low-level readers that extract JMeter property values from a parsed JMX element. */

function descendants(element: Element): Element[] {
  return Array.from(element.querySelectorAll('*'))
}

export function namedElement(element: Element, name: string): Element | undefined {
  return descendants(element).find((item) => item.getAttribute('name') === name)
}

export function prop(element: Element, name: string, fallback = ''): string {
  return namedElement(element, name)?.textContent ?? fallback
}

export function boolProp(element: Element, name: string, fallback = false): boolean {
  const value = prop(element, name, String(fallback)).trim().toLowerCase()
  return value === 'true'
}

export function numProp(element: Element, name: string, fallback: number): number {
  const value = Number(prop(element, name, String(fallback)))
  return Number.isFinite(value) ? value : fallback
}

export function collectionRows(
  element: Element,
  collectionName: string,
  fields: Record<string, string>,
): TableRow[] {
  const collection = namedElement(element, collectionName)
  if (!collection) return []
  return Array.from(collection.children)
    .filter((child) => child.tagName === 'elementProp')
    .map((row) => {
      const result: TableRow = {}
      Object.entries(fields).forEach(([key, propertyName]) => {
        const field = Array.from(row.children).find((item) => item.getAttribute('name') === propertyName)
        result[key] = field?.tagName === 'boolProp'
          ? field.textContent?.trim() === 'true'
          : field?.textContent ?? ''
      })
      return result
    })
}

export function comments(element: Element): string {
  return prop(element, 'TestPlan.comments', prop(element, 'comments', ''))
}
