import type { JMeterComponentType } from '../../models/jmeter'

export type ParsedProperties = Record<string, unknown>

export type CommonProperties = {
  comments: string
}

/**
 * A property parser for one family of components. Returns `undefined` when the
 * given type is not handled by this family so the dispatcher can try the next one.
 */
export type PropertyParser = (
  element: Element,
  type: JMeterComponentType,
  common: CommonProperties,
) => ParsedProperties | undefined
