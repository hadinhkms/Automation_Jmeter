import type { TestPlanNode } from '../../models/jmeter'
import { applyRawJmxProperties } from '../../utils/jmxRawProperties'
import { mergeEditedProperties } from '../rawXmlMerge'
import { createKnownComponent } from './createKnownComponent'
import { replaceOrAddXmlAttribute } from './xmlPrimitives'

function shouldRebuildFromProperties(node: TestPlanNode): boolean {
  return node.type === 'RegexExtractor' || node.type === 'UserDefinedVariables' || node.type === 'TestPlan'
}

function serializePreservedXml(node: TestPlanNode, rawXml: string): string {
  let xml = ''
  const rawProperties = node.properties.rawProperties
  const knownType = node.type
  if (knownType === 'UnsupportedComponent') {
    xml = Array.isArray(rawProperties) ? applyRawJmxProperties(rawXml, rawProperties) : rawXml
  } else {
    const documentNode = document.implementation.createDocument('', '', null)
    xml = mergeEditedProperties(rawXml, node, (target) => createKnownComponent(documentNode, target, knownType))
  }
  xml = replaceOrAddXmlAttribute(xml, 'testname', node.name)
  xml = replaceOrAddXmlAttribute(xml, 'enabled', String(node.enabled))
  return xml
}

function serializeFreshXml(node: TestPlanNode): string {
  const documentNode = document.implementation.createDocument('', '', null)
  const element = node.type !== 'UnsupportedComponent'
    ? createKnownComponent(documentNode, node, node.type)
    : documentNode.createElement(node.metadata?.originalClass || 'UnsupportedComponent')

  if (node.type === 'UnsupportedComponent') {
    element.setAttribute('testname', node.name)
    element.setAttribute('enabled', String(node.enabled))
  }

  return new XMLSerializer().serializeToString(element)
}

/** Serializes a node (and recursively its children) as `<element/><hashTree>...</hashTree>`. */
export function serializeNodeWithPreservation(node: TestPlanNode, indent = 0): string {
  const spaces = ' '.repeat(indent)
  const xml = node.metadata?.rawXml && !shouldRebuildFromProperties(node)
    ? serializePreservedXml(node, node.metadata.rawXml)
    : serializeFreshXml(node)

  let result = `${spaces}${xml.trim()}\n${spaces}<hashTree>\n`
  node.children.forEach((child) => {
    result += serializeNodeWithPreservation(child, indent + 2)
  })
  result += `${spaces}</hashTree>\n`

  return result
}
