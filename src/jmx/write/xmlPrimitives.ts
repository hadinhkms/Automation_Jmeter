import type { TableRow, TestPlanNode } from '../../models/jmeter'

export type XmlDocument = XMLDocument

export type CollectionField = { key: string; property: string; type?: 'bool' }

export function escapeXmlAttribute(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
}

export function replaceOrAddXmlAttribute(xml: string, name: string, value: string): string {
  const escaped = escapeXmlAttribute(value)
  const existingAttr = new RegExp(`\\s${name}=("[^"]*"|'[^']*')`, 'i')

  if (existingAttr.test(xml)) {
    return xml.replace(existingAttr, ` ${name}="${escaped}"`)
  }

  return xml.replace(/^(\s*<[A-Za-z_][\w:.-]*)(\s|\/?>)/, `$1 ${name}="${escaped}"$2`)
}

export function appendProperty(
  documentNode: XmlDocument,
  parent: Element,
  tag: 'stringProp' | 'boolProp' | 'intProp',
  name: string,
  value: unknown,
): Element {
  const element = documentNode.createElement(tag)
  element.setAttribute('name', name)
  element.textContent = value === undefined || value === null ? '' : String(value)
  parent.appendChild(element)
  return element
}

export function stringProp(documentNode: XmlDocument, parent: Element, name: string, value: unknown) {
  return appendProperty(documentNode, parent, 'stringProp', name, value)
}

export function boolProperty(documentNode: XmlDocument, parent: Element, name: string, value: unknown) {
  return appendProperty(documentNode, parent, 'boolProp', name, Boolean(value))
}

/** Shorthand writer bound to one document and parent element. */
export interface PropertySink {
  str(name: string, value: unknown): Element
  bool(name: string, value: unknown): Element
}

export function propertySink(documentNode: XmlDocument, parent: Element): PropertySink {
  return {
    str: (name, value) => stringProp(documentNode, parent, name, value),
    bool: (name, value) => boolProperty(documentNode, parent, name, value),
  }
}

export function value(node: TestPlanNode, key: string, fallback: unknown = ''): unknown {
  return node.properties[key] ?? fallback
}

export function rows(node: TestPlanNode, key: string): TableRow[] {
  const current = node.properties[key]
  // SAFETY: Array.isArray checked; editors always store these table rows as TableRow objects
  return Array.isArray(current) ? (current as TableRow[]) : []
}

export function appendCollection(
  documentNode: XmlDocument,
  parent: Element,
  name: string,
  rowTag: string,
  items: TableRow[],
  fields: CollectionField[],
) {
  const collection = documentNode.createElement('collectionProp')
  collection.setAttribute('name', name)
  items.forEach((item, index) => {
    const element = documentNode.createElement('elementProp')
    element.setAttribute('name', String(item.name ?? `${rowTag}-${index}`))
    element.setAttribute('elementType', rowTag)
    fields.forEach((field) => {
      if (field.type === 'bool') boolProperty(documentNode, element, field.property, item[field.key])
      else stringProp(documentNode, element, field.property, item[field.key] ?? '')
    })
    collection.appendChild(element)
  })
  parent.appendChild(collection)
  return collection
}

/** Creates a nested `elementProp` wrapper with the standard JMeter GUI/test class attributes. */
export function createElementProp(
  documentNode: XmlDocument,
  name: string,
  elementType: string,
  guiclass: string,
  testclass: string,
): Element {
  const element = documentNode.createElement('elementProp')
  element.setAttribute('name', name)
  element.setAttribute('elementType', elementType)
  element.setAttribute('guiclass', guiclass)
  element.setAttribute('testclass', testclass)
  return element
}
