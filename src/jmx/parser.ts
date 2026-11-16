import type { TestPlanNode } from '../models/jmeter'
import { createNode } from '../mock/sampleTestPlan'
import { parseRawJmxProperties } from '../utils/jmxRawProperties'
import { mapElementToType } from './mappings'
import { parseProperties } from './parse/parseProperties'

export { parseProperties }

export interface JmxParser {
  parse(xml: string): TestPlanNode
}

function parseComponent(element: Element): TestPlanNode {
  const type = mapElementToType(element)
  const rawXml = new XMLSerializer().serializeToString(element)
  const properties = parseProperties(element, type)
  if (type === 'UnsupportedComponent') {
    properties.rawProperties = parseRawJmxProperties(rawXml)
  }
  const node = createNode(type, element.getAttribute('testname') || element.tagName, properties)
  node.enabled = element.getAttribute('enabled') !== 'false'
  node.metadata = {
    rawXml,
    originalClass: element.getAttribute('testclass') || element.tagName,
  }
  if (type === 'UnsupportedComponent') {
    node.metadata.originalClass = element.getAttribute('testclass') || element.tagName
  }
  return node
}

function parseHashTree(hashTree: Element): TestPlanNode[] {
  const children = Array.from(hashTree.children)
  const nodes: TestPlanNode[] = []
  for (let index = 0; index < children.length; index += 1) {
    const component = children[index]
    if (component.tagName === 'hashTree') continue
    const node = parseComponent(component)
    const next = children[index + 1]
    if (next?.tagName === 'hashTree') {
      node.children = parseHashTree(next)
      index += 1
    }
    nodes.push(node)
  }
  return nodes
}

export const browserJmxParser: JmxParser = {
  parse(xml) {
    const documentNode = new DOMParser().parseFromString(xml, 'application/xml')
    const parseError = documentNode.querySelector('parsererror')
    if (parseError) throw new Error(`Invalid JMX XML: ${parseError.textContent ?? 'parse error'}`)

    const root = documentNode.documentElement
    const hashTree = root.tagName === 'hashTree'
      ? root
      : Array.from(root.children).find((child) => child.tagName === 'hashTree')
    if (!hashTree) throw new Error('This file does not contain a JMeter hashTree.')

    const nodes = parseHashTree(hashTree)
    const testPlan = nodes.find((node) => node.type === 'TestPlan')
    if (testPlan) {
      const otherRootNodes = nodes.filter((node) => node !== testPlan)
      if (otherRootNodes.length > 0) {
        testPlan.children = [...testPlan.children, ...otherRootNodes]
      }
      return testPlan
    }
    return createNode('TestPlan', 'Imported Test Plan', {}, nodes)
  },
}
