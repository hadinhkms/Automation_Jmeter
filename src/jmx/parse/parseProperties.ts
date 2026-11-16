import type { JMeterComponentType } from '../../models/jmeter'
import { comments } from './domReaders'
import { parseConfigProperties, parseControllerProperties, parseExtractorProperties } from './elementProperties'
import { parseSamplerProperties } from './samplerProperties'
import { parseThreadGroupProperties } from './threadGroupProperties'
import type { PropertyParser } from './types'

const PROPERTY_PARSERS: PropertyParser[] = [
  parseThreadGroupProperties,
  parseSamplerProperties,
  parseConfigProperties,
  parseControllerProperties,
  parseExtractorProperties,
]

/** Reads the editor-facing properties of a JMX element for the given component type. */
export function parseProperties(element: Element, type: JMeterComponentType): Record<string, unknown> {
  const common = { comments: comments(element) }
  for (const parser of PROPERTY_PARSERS) {
    const parsed = parser(element, type, common)
    if (parsed) return parsed
  }
  return common
}
