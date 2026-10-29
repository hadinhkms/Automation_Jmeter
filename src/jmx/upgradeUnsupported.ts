import type { TestPlanNode } from '../models/jmeter'
import { mapElementToType } from './mappings'
import { parseProperties } from './parser'

/**
 * Re-maps nodes persisted as UnsupportedComponent whose JMX class has since gained
 * first-class support (e.g. GenericController -> SimpleController), so plans restored
 * from storage pick up new editors without a re-import.
 */
export function upgradeUnsupportedNodes(node: TestPlanNode): TestPlanNode {
  const children = node.children.map(upgradeUnsupportedNodes)
  const rawXml = node.metadata?.rawXml
  if (node.type !== 'UnsupportedComponent' || !rawXml || typeof DOMParser === 'undefined') {
    return children.every((child, index) => child === node.children[index]) ? node : { ...node, children }
  }

  const element = new DOMParser().parseFromString(rawXml, 'application/xml').documentElement
  if (!element || element.getElementsByTagName('parsererror').length > 0) return { ...node, children }

  const type = mapElementToType(element)
  if (type === 'UnsupportedComponent') return { ...node, children }

  const properties = { ...parseProperties(element, type), comments: node.properties.comments ?? '' }
  return { ...node, type, properties, children }
}
