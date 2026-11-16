import type { JMeterComponentType, TestPlanNode } from '../../models/jmeter'
import type { XmlDocument } from './xmlPrimitives'

/**
 * Writes the type-specific properties of one family of components into `element`.
 * Returns `true` when the type belongs to this family, `false` otherwise.
 */
export type ComponentWriter = (
  documentNode: XmlDocument,
  element: Element,
  node: TestPlanNode,
  type: JMeterComponentType,
) => boolean
