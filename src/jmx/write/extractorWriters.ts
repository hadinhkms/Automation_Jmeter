import type { TestPlanNode } from '../../models/jmeter'
import type { ComponentWriter } from './types'
import { appendProperty, propertySink, rows, stringProp, value } from './xmlPrimitives'
import type { PropertySink, XmlDocument } from './xmlPrimitives'

const JMETER_REGEX_FIELDS = ['false', 'true', 'unescaped', 'request_headers', 'URL', 'code', 'message', 'as_document']

export function editorScopeToJMeterScope(rawScope: unknown): string {
  const scope = String(rawScope || 'main')
  if (scope === 'main-and-sub') return 'all'
  if (scope === 'sub') return 'children'
  if (scope === 'all' || scope === 'children' || scope === 'variable') return scope
  return 'main'
}

export function editorRegexFieldToJMeterField(rawField: unknown): string {
  const field = String(rawField || 'body')
  if (field === 'body') return 'false'
  if (field === 'body-unescaped') return 'unescaped'
  if (field === 'headers') return 'true'
  if (field === 'request-headers') return 'request_headers'
  if (field === 'url') return 'URL'
  if (field === 'document') return 'as_document'
  if (JMETER_REGEX_FIELDS.includes(field)) return field
  return 'false'
}

function writeScope(p: PropertySink, scope: string, emit: boolean, scopeVariable: string) {
  if (emit) {
    p.str('Sample.scope', scope)
  }
  if (scope === 'variable' && scopeVariable) {
    p.str('Scope.variable', scopeVariable)
  }
}

function writeResponseAssertion(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  const p = propertySink(documentNode, element)
  const matchBits: Record<string, number> = { matches: 1, contains: 2, equals: 8, substring: 16 }
  let testType = matchBits[String(value(node, 'matchType', 'equals'))] ?? 8
  if (value(node, 'not', false)) testType |= 4
  if (value(node, 'or', false)) testType |= 32
  const testField = String(value(node, 'field', 'response-code')).replace('-', '_')
  p.str('Sample.scope', value(node, 'applyTo', 'main-and-sub'))
  p.str('Assertion.test_field', `Assertion.${testField}`)
  appendProperty(documentNode, element, 'intProp', 'Assertion.test_type', testType)
  const patterns = documentNode.createElement('collectionProp')
  patterns.setAttribute('name', 'Asserion.test_strings')
  rows(node, 'patterns').forEach((row, index) => stringProp(documentNode, patterns, String(index), row.pattern ?? ''))
  element.appendChild(patterns)
  p.bool('Assertion.assume_success', value(node, 'ignoreStatus', false))
}

/** JSON / Regex extractors and response / JSONPath assertions. */
export const writeExtractorComponent: ComponentWriter = (documentNode, element, node, type) => {
  const p = propertySink(documentNode, element)
  switch (type) {
    case 'JSONExtractor': {
      const scope = String(value(node, 'scope', value(node, 'applyTo', 'main')))
      writeScope(p, scope, Boolean(scope && scope !== 'main'), String(value(node, 'scopeVariable', '')))
      p.str('JSONPostProcessor.referenceNames', value(node, 'variableNames'))
      p.str('JSONPostProcessor.jsonPathExprs', value(node, 'jsonPaths'))
      p.str('JSONPostProcessor.match_numbers', value(node, 'matchNumbers', '1'))
      p.bool('JSONPostProcessor.compute_concat', value(node, 'computeConcat', false))
      p.str('JSONPostProcessor.defaultValues', value(node, 'defaults'))
      return true
    }
    case 'RegexExtractor': {
      const scope = editorScopeToJMeterScope(value(node, 'scope', value(node, 'applyTo', 'main')))
      writeScope(p, scope, scope !== 'main', String(value(node, 'scopeVariable', '')))
      p.str('RegexExtractor.useHeaders', editorRegexFieldToJMeterField(value(node, 'field', 'body')))
      p.str('RegexExtractor.refname', value(node, 'referenceName'))
      p.str('RegexExtractor.regex', value(node, 'regex'))
      p.str('RegexExtractor.template', value(node, 'template', '$1$'))
      p.str('RegexExtractor.match_number', value(node, 'matchNumber', 1))
      p.str('RegexExtractor.default', value(node, 'defaultValue'))
      p.bool('RegexExtractor.default_empty_value', value(node, 'emptyDefault', false))
      return true
    }
    case 'ResponseAssertion':
      writeResponseAssertion(documentNode, element, node)
      return true
    case 'JSONPathAssertion':
      p.str('JSON_PATH', value(node, 'jsonPath', '$.code'))
      p.str('EXPECTED_VALUE', value(node, 'expectedValue', '200'))
      p.bool('JSONVALIDATION', value(node, 'jsonValidation', true))
      p.bool('EXPECT_NULL', value(node, 'expectNull', false))
      p.bool('INVERT', value(node, 'invert', false))
      p.bool('ISREGEX', value(node, 'isRegex', false))
      return true
    default:
      return false
  }
}
