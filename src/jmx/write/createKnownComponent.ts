import type { JMeterComponentType, TestPlanNode } from '../../models/jmeter'
import { typeToElement } from '../mappings'
import { writeConfigComponent } from './configWriters'
import { writeExtractorComponent } from './extractorWriters'
import { writeHttpComponent } from './httpWriters'
import { writeListenerComponent } from './listenerWriters'
import { writeLogicComponent } from './logicWriters'
import { writeProtocolSampler } from './protocolSamplerWriters'
import { writeThreadGroupComponent } from './threadGroupWriters'
import type { ComponentWriter } from './types'
import { stringProp, value } from './xmlPrimitives'
import type { XmlDocument } from './xmlPrimitives'

const COMPONENT_WRITERS: ComponentWriter[] = [
  writeThreadGroupComponent,
  writeHttpComponent,
  writeProtocolSampler,
  writeListenerComponent,
  writeConfigComponent,
  writeLogicComponent,
  writeExtractorComponent,
]

/** Builds a fresh JMX element for a supported component type from its editor properties. */
export function createKnownComponent(
  documentNode: XmlDocument,
  node: TestPlanNode,
  type: Exclude<JMeterComponentType, 'UnsupportedComponent'>,
): Element {
  const mapping = typeToElement[type]
  const element = documentNode.createElement(mapping.tag)
  element.setAttribute('guiclass', mapping.guiclass)
  element.setAttribute('testclass', mapping.testclass)
  element.setAttribute('testname', node.name)
  element.setAttribute('enabled', String(node.enabled))
  stringProp(documentNode, element, 'comments', value(node, 'comments'))

  for (const writer of COMPONENT_WRITERS) {
    if (writer(documentNode, element, node, type)) break
  }

  return element
}
