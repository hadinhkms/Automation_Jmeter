import type { TestPlanNode } from '../models/jmeter'
import { createNode } from '../mock/sampleTestPlan'
import { parseProperties } from './parser'

type BuildElement = (node: TestPlanNode) => Element

function namedChildren(element: Element): Map<string, Element> {
  const result = new Map<string, Element>()
  for (const child of Array.from(element.children)) {
    const name = child.getAttribute('name')
    if (name && !result.has(name)) result.set(name, child)
  }
  return result
}

function sameJson(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

/**
 * Imported nodes keep their original JMX XML so properties the editor does not model survive a save.
 * When the editor changed modelled properties, rebuild the component twice (from the original parsed
 * properties and from the current ones) and patch into the raw XML only the property elements that differ.
 * Untouched nodes are returned byte-for-byte unchanged.
 */
export function mergeEditedProperties(rawXml: string, node: TestPlanNode, build: BuildElement): string {
  const rawDoc = new DOMParser().parseFromString(rawXml, 'application/xml')
  const rawElement = rawDoc.documentElement
  if (!rawElement || rawDoc.getElementsByTagName('parsererror').length > 0) return rawXml

  // Same default merge the parser applies (createNode), so untouched nodes compare equal
  const originalProperties = createNode(node.type, node.name, parseProperties(rawElement, node.type)).properties
  if (sameJson(originalProperties, node.properties)) return rawXml

  const serializer = new XMLSerializer()
  const current = namedChildren(build(node))
  const original = namedChildren(build({ ...node, properties: originalProperties }))
  const rawChildren = namedChildren(rawElement)
  let changed = false

  for (const [name, currentChild] of current) {
    const originalChild = original.get(name)
    if (originalChild && serializer.serializeToString(originalChild) === serializer.serializeToString(currentChild)) continue
    const imported = rawDoc.importNode(currentChild, true)
    const rawChild = rawChildren.get(name)
    if (rawChild) rawElement.replaceChild(imported, rawChild)
    else rawElement.appendChild(imported)
    changed = true
  }

  for (const name of original.keys()) {
    if (current.has(name)) continue
    const rawChild = rawChildren.get(name)
    if (rawChild) {
      rawElement.removeChild(rawChild)
      changed = true
    }
  }

  return changed ? serializer.serializeToString(rawElement) : rawXml
}
