import type { JMeterComponentType, TableRow, TestPlanNode } from '../models/jmeter'
import { typeToElement } from './mappings'

export interface JmxWriter {
  write(testPlan: TestPlanNode): string
}

type XmlDocument = XMLDocument

function appendProperty(documentNode: XmlDocument, parent: Element, tag: 'stringProp' | 'boolProp' | 'intProp', name: string, value: unknown): Element {
  const element = documentNode.createElement(tag)
  element.setAttribute('name', name)
  element.textContent = value === undefined || value === null ? '' : String(value)
  parent.appendChild(element)
  return element
}

function stringProp(documentNode: XmlDocument, parent: Element, name: string, value: unknown) {
  return appendProperty(documentNode, parent, 'stringProp', name, value)
}

function boolProperty(documentNode: XmlDocument, parent: Element, name: string, value: unknown) {
  return appendProperty(documentNode, parent, 'boolProp', name, Boolean(value))
}

function value(node: TestPlanNode, key: string, fallback: unknown = ''): unknown {
  return node.properties[key] ?? fallback
}

function rows(node: TestPlanNode, key: string): TableRow[] {
  const current = node.properties[key]
  return Array.isArray(current) ? (current as TableRow[]) : []
}

function appendCollection(
  documentNode: XmlDocument,
  parent: Element,
  name: string,
  rowTag: string,
  items: TableRow[],
  fields: Array<{ key: string; property: string; type?: 'bool' }>,
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

function appendArguments(documentNode: XmlDocument, parent: Element, items: TableRow[], name = 'HTTPsampler.Arguments') {
  const args = documentNode.createElement('elementProp')
  args.setAttribute('name', name)
  args.setAttribute('elementType', 'Arguments')
  args.setAttribute('guiclass', 'HTTPArgumentsPanel')
  args.setAttribute('testclass', 'Arguments')
  args.setAttribute('enabled', 'true')
  appendCollection(documentNode, args, 'Arguments.arguments', 'HTTPArgument', items, [
    { key: 'name', property: 'Argument.name' },
    { key: 'value', property: 'Argument.value' },
    { key: 'metadata', property: 'Argument.metadata' },
    { key: 'encode', property: 'HTTPArgument.always_encode', type: 'bool' },
    { key: 'includeEquals', property: 'HTTPArgument.use_equals', type: 'bool' },
  ])
  parent.appendChild(args)
}

function appendCommon(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  stringProp(documentNode, element, 'comments', value(node, 'comments'))
}

function createKnownComponent(documentNode: XmlDocument, node: TestPlanNode, type: Exclude<JMeterComponentType, 'UnsupportedComponent'>): Element {
  const mapping = typeToElement[type]
  const element = documentNode.createElement(mapping.tag)
  element.setAttribute('guiclass', mapping.guiclass)
  element.setAttribute('testclass', mapping.testclass)
  element.setAttribute('testname', node.name)
  element.setAttribute('enabled', String(node.enabled))
  appendCommon(documentNode, element, node)

  switch (type) {
    case 'TestPlan': {
      boolProperty(documentNode, element, 'TestPlan.functional_mode', value(node, 'functionalMode', false))
      boolProperty(documentNode, element, 'TestPlan.tearDown_on_shutdown', value(node, 'tearDownAfterShutdown', true))
      boolProperty(documentNode, element, 'TestPlan.serialize_threadgroups', value(node, 'serializeThreadGroups', false))
      appendArguments(documentNode, element, rows(node, 'variables'), 'TestPlan.user_defined_variables')
      break
    }
    case 'UserDefinedVariables':
      appendCollection(documentNode, element, 'Arguments.arguments', 'Argument', rows(node, 'variables'), [
        { key: 'name', property: 'Argument.name' },
        { key: 'value', property: 'Argument.value' },
      ])
      break
    case 'ThreadGroup': {
      stringProp(documentNode, element, 'ThreadGroup.on_sample_error', value(node, 'onError', 'continue'))
      const loop = documentNode.createElement('elementProp')
      loop.setAttribute('name', 'ThreadGroup.main_controller')
      loop.setAttribute('elementType', 'LoopController')
      loop.setAttribute('guiclass', 'LoopControlPanel')
      loop.setAttribute('testclass', 'LoopController')
      loop.setAttribute('testname', 'Loop Controller')
      loop.setAttribute('enabled', 'true')
      boolProperty(documentNode, loop, 'LoopController.continue_forever', false)
      stringProp(documentNode, loop, 'LoopController.loops', value(node, 'loops', 1))
      element.appendChild(loop)
      stringProp(documentNode, element, 'ThreadGroup.num_threads', value(node, 'threads', 1))
      stringProp(documentNode, element, 'ThreadGroup.ramp_time', value(node, 'rampUp', 1))
      boolProperty(documentNode, element, 'ThreadGroup.same_user_on_next_iteration', value(node, 'sameUser', true))
      boolProperty(documentNode, element, 'ThreadGroup.delayedStart', value(node, 'delayedStart', false))
      boolProperty(documentNode, element, 'ThreadGroup.scheduler', value(node, 'scheduler', false))
      stringProp(documentNode, element, 'ThreadGroup.duration', value(node, 'duration', 0))
      stringProp(documentNode, element, 'ThreadGroup.delay', value(node, 'startupDelay', 0))
      break
    }
    case 'HTTPRequestDefaults':
      stringProp(documentNode, element, 'HTTPSampler.domain', value(node, 'server'))
      stringProp(documentNode, element, 'HTTPSampler.port', value(node, 'port'))
      stringProp(documentNode, element, 'HTTPSampler.protocol', value(node, 'protocol'))
      stringProp(documentNode, element, 'HTTPSampler.contentEncoding', value(node, 'contentEncoding'))
      stringProp(documentNode, element, 'HTTPSampler.path', value(node, 'path'))
      break
    case 'HTTPRequest': {
      const body = String(value(node, 'body'))
      const parameters = body
        ? [{ name: '', value: body, metadata: '=', encode: false, includeEquals: true }]
        : rows(node, 'parameters').map((row) => ({ metadata: '=', ...row }))
      appendArguments(documentNode, element, parameters)
      stringProp(documentNode, element, 'HTTPSampler.domain', value(node, 'server'))
      stringProp(documentNode, element, 'HTTPSampler.port', value(node, 'port'))
      stringProp(documentNode, element, 'HTTPSampler.protocol', value(node, 'protocol'))
      stringProp(documentNode, element, 'HTTPSampler.contentEncoding', value(node, 'contentEncoding'))
      stringProp(documentNode, element, 'HTTPSampler.path', value(node, 'path'))
      stringProp(documentNode, element, 'HTTPSampler.method', value(node, 'method', 'GET'))
      boolProperty(documentNode, element, 'HTTPSampler.follow_redirects', value(node, 'followRedirects', true))
      boolProperty(documentNode, element, 'HTTPSampler.auto_redirects', value(node, 'autoRedirects', false))
      boolProperty(documentNode, element, 'HTTPSampler.use_keepalive', value(node, 'keepAlive', true))
      boolProperty(documentNode, element, 'HTTPSampler.DO_MULTIPART_POST', value(node, 'multipart', false))
      boolProperty(documentNode, element, 'HTTPSampler.BROWSER_COMPATIBLE_MULTIPART', value(node, 'browserCompatible', false))
      boolProperty(documentNode, element, 'HTTPSampler.postBodyRaw', Boolean(body))
      appendCollection(documentNode, element, 'HTTPsampler.Files', 'HTTPFileArg', rows(node, 'files'), [
        { key: 'path', property: 'File.path' },
        { key: 'parameterName', property: 'File.paramname' },
        { key: 'mimeType', property: 'File.mimetype' },
      ])
      break
    }
    case 'HTTPHeaderManager':
      appendCollection(documentNode, element, 'HeaderManager.headers', 'Header', rows(node, 'headers'), [
        { key: 'name', property: 'Header.name' },
        { key: 'value', property: 'Header.value' },
      ])
      break
    case 'HTTPCookieManager':
      boolProperty(documentNode, element, 'CookieManager.clearEachIteration', value(node, 'clearEachIteration', false))
      boolProperty(documentNode, element, 'CookieManager.controlledByThreadGroup', value(node, 'controlledByThreadGroup', false))
      appendCollection(documentNode, element, 'CookieManager.cookies', 'Cookie', rows(node, 'cookies'), [
        { key: 'name', property: 'Cookie.name' },
        { key: 'value', property: 'Cookie.value' },
        { key: 'domain', property: 'Cookie.domain' },
        { key: 'path', property: 'Cookie.path' },
        { key: 'secure', property: 'Cookie.secure', type: 'bool' },
        { key: 'expires', property: 'Cookie.expires' },
      ])
      break
    case 'CSVDataSet':
      stringProp(documentNode, element, 'filename', value(node, 'filename'))
      stringProp(documentNode, element, 'fileEncoding', value(node, 'encoding', 'UTF-8'))
      stringProp(documentNode, element, 'variableNames', value(node, 'variableNames'))
      boolProperty(documentNode, element, 'ignoreFirstLine', value(node, 'ignoreFirstLine', false))
      stringProp(documentNode, element, 'delimiter', value(node, 'delimiter', ','))
      boolProperty(documentNode, element, 'quotedData', value(node, 'quotedData', false))
      boolProperty(documentNode, element, 'recycle', value(node, 'recycle', true))
      boolProperty(documentNode, element, 'stopThread', value(node, 'stopThread', false))
      stringProp(documentNode, element, 'shareMode', value(node, 'sharingMode', 'all'))
      break
    case 'TransactionController':
      boolProperty(documentNode, element, 'TransactionController.parent', value(node, 'generateParent', false))
      boolProperty(documentNode, element, 'TransactionController.includeTimers', value(node, 'includeTimers', false))
      break
    case 'IfController':
      stringProp(documentNode, element, 'IfController.condition', value(node, 'condition'))
      boolProperty(documentNode, element, 'IfController.useExpression', !value(node, 'interpretExpression', true))
      boolProperty(documentNode, element, 'IfController.evaluateAll', value(node, 'evaluateAll', false))
      break
    case 'LoopController':
      boolProperty(documentNode, element, 'LoopController.continue_forever', value(node, 'forever', false))
      stringProp(documentNode, element, 'LoopController.loops', value(node, 'loops', 1))
      break
    case 'ConstantTimer':
      stringProp(documentNode, element, 'ConstantTimer.delay', value(node, 'delay', 0))
      break
    case 'JSONExtractor':
      stringProp(documentNode, element, 'JSONPostProcessor.referenceNames', value(node, 'variableNames'))
      stringProp(documentNode, element, 'JSONPostProcessor.jsonPathExprs', value(node, 'jsonPaths'))
      stringProp(documentNode, element, 'JSONPostProcessor.match_numbers', value(node, 'matchNumbers', '1'))
      boolProperty(documentNode, element, 'JSONPostProcessor.compute_concat', value(node, 'computeConcat', false))
      stringProp(documentNode, element, 'JSONPostProcessor.defaultValues', value(node, 'defaults'))
      break
    case 'RegexExtractor':
      stringProp(documentNode, element, 'Sample.scope', value(node, 'applyTo', 'main'))
      stringProp(documentNode, element, 'RegexExtractor.useHeaders', value(node, 'field', 'body'))
      stringProp(documentNode, element, 'RegexExtractor.refname', value(node, 'referenceName'))
      stringProp(documentNode, element, 'RegexExtractor.regex', value(node, 'regex'))
      stringProp(documentNode, element, 'RegexExtractor.template', value(node, 'template', '$1$'))
      stringProp(documentNode, element, 'RegexExtractor.match_number', value(node, 'matchNumber', 1))
      stringProp(documentNode, element, 'RegexExtractor.default', value(node, 'defaultValue'))
      boolProperty(documentNode, element, 'RegexExtractor.default_empty_value', value(node, 'emptyDefault', false))
      break
    case 'ResponseAssertion': {
      const matchBits: Record<string, number> = { matches: 1, contains: 2, equals: 8, substring: 16 }
      let testType = matchBits[String(value(node, 'matchType', 'equals'))] ?? 8
      if (value(node, 'not', false)) testType |= 4
      if (value(node, 'or', false)) testType |= 32
      stringProp(documentNode, element, 'Sample.scope', value(node, 'applyTo', 'main-and-sub'))
      stringProp(documentNode, element, 'Assertion.test_field', `Assertion.${String(value(node, 'field', 'response-code')).replace('-', '_')}`)
      appendProperty(documentNode, element, 'intProp', 'Assertion.test_type', testType)
      const patterns = documentNode.createElement('collectionProp')
      patterns.setAttribute('name', 'Asserion.test_strings')
      rows(node, 'patterns').forEach((row, index) => stringProp(documentNode, patterns, String(index), row.pattern ?? ''))
      element.appendChild(patterns)
      boolProperty(documentNode, element, 'Assertion.assume_success', value(node, 'ignoreStatus', false))
      break
    }
    case 'JSR223Sampler':
    case 'JSR223PreProcessor':
    case 'JSR223PostProcessor':
    case 'JSR223Assertion':
      stringProp(documentNode, element, 'scriptLanguage', value(node, 'language', 'groovy'))
      stringProp(documentNode, element, 'parameters', value(node, 'parameters'))
      stringProp(documentNode, element, 'filename', value(node, 'scriptFile'))
      stringProp(documentNode, element, 'cacheKey', value(node, 'cache', true) ? 'true' : 'false')
      stringProp(documentNode, element, 'script', value(node, 'script'))
      break
    case 'ViewResultsTree':
    case 'SummaryReport':
    case 'AggregateReport':
      boolProperty(documentNode, element, 'ResultCollector.error_logging', false)
      stringProp(documentNode, element, 'filename', '')
      break
  }

  return element
}

function createComponent(documentNode: XmlDocument, node: TestPlanNode): Element {
  if (node.type !== 'UnsupportedComponent') return createKnownComponent(documentNode, node, node.type)
  if (node.metadata?.rawXml) {
    const parsed = new DOMParser().parseFromString(node.metadata.rawXml, 'application/xml')
    if (!parsed.querySelector('parsererror')) return documentNode.importNode(parsed.documentElement, true)
  }
  const fallback = documentNode.createElement(node.metadata?.originalClass || 'UnsupportedComponent')
  fallback.setAttribute('testname', node.name)
  fallback.setAttribute('enabled', String(node.enabled))
  return fallback
}

function appendNode(documentNode: XmlDocument, hashTree: Element, node: TestPlanNode) {
  hashTree.appendChild(createComponent(documentNode, node))
  const childTree = documentNode.createElement('hashTree')
  node.children.forEach((child) => appendNode(documentNode, childTree, child))
  hashTree.appendChild(childTree)
}

export const browserJmxWriter: JmxWriter = {
  write(testPlan) {
    const documentNode = document.implementation.createDocument('', '', null)
    const root = documentNode.createElement('jmeterTestPlan')
    root.setAttribute('version', '1.2')
    root.setAttribute('properties', '5.0')
    root.setAttribute('jmeter', '5.6.3')
    documentNode.appendChild(root)
    const hashTree = documentNode.createElement('hashTree')
    root.appendChild(hashTree)
    appendNode(documentNode, hashTree, testPlan)
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(documentNode)}`
  },
}
