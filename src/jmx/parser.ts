import type { JMeterComponentType, TableRow, TestPlanNode } from '../models/jmeter'
import { createNode } from '../mock/sampleTestPlan'
import { mapElementToType } from './mappings'

export interface JmxParser {
  parse(xml: string): TestPlanNode
}

function descendants(element: Element): Element[] {
  return Array.from(element.querySelectorAll('*'))
}

function namedElement(element: Element, name: string): Element | undefined {
  return descendants(element).find((item) => item.getAttribute('name') === name)
}

function prop(element: Element, name: string, fallback = ''): string {
  return namedElement(element, name)?.textContent ?? fallback
}

function boolProp(element: Element, name: string, fallback = false): boolean {
  const value = prop(element, name, String(fallback)).trim().toLowerCase()
  return value === 'true'
}

function numProp(element: Element, name: string, fallback: number): number {
  const value = Number(prop(element, name, String(fallback)))
  return Number.isFinite(value) ? value : fallback
}

function collectionRows(element: Element, collectionName: string, fields: Record<string, string>): TableRow[] {
  const collection = namedElement(element, collectionName)
  if (!collection) return []
  return Array.from(collection.children)
    .filter((child) => child.tagName === 'elementProp')
    .map((row) => {
      const result: TableRow = {}
      Object.entries(fields).forEach(([key, propertyName]) => {
        const field = Array.from(row.children).find((item) => item.getAttribute('name') === propertyName)
        result[key] = field?.tagName === 'boolProp'
          ? field.textContent?.trim() === 'true'
          : field?.textContent ?? ''
      })
      return result
    })
}

function comments(element: Element): string {
  return prop(element, 'TestPlan.comments', prop(element, 'comments', ''))
}

function assertionMatchType(element: Element): string {
  const raw = Number(prop(element, 'Assertion.test_type', '8'))
  if ((raw & 16) === 16) return 'substring'
  if ((raw & 8) === 8) return 'equals'
  if ((raw & 2) === 2) return 'contains'
  return 'matches'
}

function parseProperties(element: Element, type: JMeterComponentType): Record<string, unknown> {
  const common = { comments: comments(element) }
  switch (type) {
    case 'TestPlan':
      return {
        ...common,
        variables: collectionRows(element, 'Arguments.arguments', { name: 'Argument.name', value: 'Argument.value' }),
        functionalMode: boolProp(element, 'TestPlan.functional_mode'),
        tearDownAfterShutdown: boolProp(element, 'TestPlan.tearDown_on_shutdown', true),
        serializeThreadGroups: boolProp(element, 'TestPlan.serialize_threadgroups'),
      }
    case 'UserDefinedVariables':
      return { ...common, variables: collectionRows(element, 'Arguments.arguments', { name: 'Argument.name', value: 'Argument.value' }) }
    case 'ThreadGroup':
      return {
        ...common,
        onError: prop(element, 'ThreadGroup.on_sample_error', 'continue'),
        threads: numProp(element, 'ThreadGroup.num_threads', 1),
        rampUp: numProp(element, 'ThreadGroup.ramp_time', 1),
        loops: numProp(element, 'LoopController.loops', 1),
        sameUser: boolProp(element, 'ThreadGroup.same_user_on_next_iteration', true),
        delayedStart: boolProp(element, 'ThreadGroup.delayedStart'),
        scheduler: boolProp(element, 'ThreadGroup.scheduler'),
        duration: numProp(element, 'ThreadGroup.duration', 0),
        startupDelay: numProp(element, 'ThreadGroup.delay', 0),
      }
    case 'HTTPRequest': {
      const parameters = collectionRows(element, 'Arguments.arguments', {
        name: 'Argument.name',
        value: 'Argument.value',
        encode: 'HTTPArgument.always_encode',
        includeEquals: 'HTTPArgument.use_equals',
      })
      const rawBody = boolProp(element, 'HTTPSampler.postBodyRaw')
      return {
        ...common,
        protocol: prop(element, 'HTTPSampler.protocol'),
        server: prop(element, 'HTTPSampler.domain'),
        port: prop(element, 'HTTPSampler.port'),
        method: prop(element, 'HTTPSampler.method', 'GET'),
        path: prop(element, 'HTTPSampler.path', '/'),
        contentEncoding: prop(element, 'HTTPSampler.contentEncoding'),
        followRedirects: boolProp(element, 'HTTPSampler.follow_redirects', true),
        autoRedirects: boolProp(element, 'HTTPSampler.auto_redirects'),
        keepAlive: boolProp(element, 'HTTPSampler.use_keepalive', true),
        multipart: boolProp(element, 'HTTPSampler.DO_MULTIPART_POST'),
        browserCompatible: boolProp(element, 'HTTPSampler.BROWSER_COMPATIBLE_MULTIPART'),
        parameters: rawBody ? [] : parameters,
        body: rawBody ? String(parameters[0]?.value ?? '') : '',
        files: collectionRows(element, 'HTTPsampler.Files', { path: 'File.path', parameterName: 'File.paramname', mimeType: 'File.mimetype' }),
      }
    }
    case 'HTTPRequestDefaults':
      return {
        ...common,
        protocol: prop(element, 'HTTPSampler.protocol'),
        server: prop(element, 'HTTPSampler.domain'),
        port: prop(element, 'HTTPSampler.port'),
        path: prop(element, 'HTTPSampler.path'),
        contentEncoding: prop(element, 'HTTPSampler.contentEncoding'),
      }
    case 'HTTPHeaderManager':
      return { ...common, headers: collectionRows(element, 'HeaderManager.headers', { name: 'Header.name', value: 'Header.value' }) }
    case 'HTTPCookieManager':
      return {
        ...common,
        clearEachIteration: boolProp(element, 'CookieManager.clearEachIteration'),
        controlledByThreadGroup: boolProp(element, 'CookieManager.controlledByThreadGroup'),
        cookies: collectionRows(element, 'CookieManager.cookies', { name: 'Cookie.name', value: 'Cookie.value', domain: 'Cookie.domain', path: 'Cookie.path', secure: 'Cookie.secure', expires: 'Cookie.expires' }),
      }
    case 'CSVDataSet':
      return {
        ...common,
        filename: prop(element, 'filename'),
        encoding: prop(element, 'fileEncoding', 'UTF-8'),
        variableNames: prop(element, 'variableNames'),
        ignoreFirstLine: boolProp(element, 'ignoreFirstLine'),
        delimiter: prop(element, 'delimiter', ','),
        quotedData: boolProp(element, 'quotedData'),
        recycle: boolProp(element, 'recycle', true),
        stopThread: boolProp(element, 'stopThread'),
        sharingMode: prop(element, 'shareMode', 'all'),
      }
    case 'TransactionController':
      return { ...common, generateParent: boolProp(element, 'TransactionController.parent'), includeTimers: boolProp(element, 'TransactionController.includeTimers') }
    case 'IfController':
      return { ...common, condition: prop(element, 'IfController.condition'), interpretExpression: !boolProp(element, 'IfController.useExpression'), evaluateAll: boolProp(element, 'IfController.evaluateAll') }
    case 'LoopController':
      return { ...common, loops: numProp(element, 'LoopController.loops', 1), forever: boolProp(element, 'LoopController.continue_forever') }
    case 'ConstantTimer':
      return { ...common, delay: numProp(element, 'ConstantTimer.delay', 0) }
    case 'JSONExtractor':
      return { ...common, variableNames: prop(element, 'JSONPostProcessor.referenceNames'), jsonPaths: prop(element, 'JSONPostProcessor.jsonPathExprs'), matchNumbers: prop(element, 'JSONPostProcessor.match_numbers', '1'), computeConcat: boolProp(element, 'JSONPostProcessor.compute_concat'), defaults: prop(element, 'JSONPostProcessor.defaultValues') }
    case 'RegexExtractor':
      return { ...common, applyTo: prop(element, 'Sample.scope', 'main'), field: prop(element, 'RegexExtractor.useHeaders', 'body'), referenceName: prop(element, 'RegexExtractor.refname'), regex: prop(element, 'RegexExtractor.regex'), template: prop(element, 'RegexExtractor.template', '$1$'), matchNumber: numProp(element, 'RegexExtractor.match_number', 1), defaultValue: prop(element, 'RegexExtractor.default'), emptyDefault: boolProp(element, 'RegexExtractor.default_empty_value') }
    case 'ResponseAssertion':
      return {
        ...common,
        applyTo: prop(element, 'Sample.scope', 'main-and-sub'),
        field: prop(element, 'Assertion.test_field', 'Assertion.response_code').replace('Assertion.', '').replace('_', '-'),
        matchType: assertionMatchType(element),
        patterns: Array.from(namedElement(element, 'Asserion.test_strings')?.children ?? []).map((item) => ({ pattern: item.textContent ?? '' })),
        not: (numProp(element, 'Assertion.test_type', 8) & 4) === 4,
        or: (numProp(element, 'Assertion.test_type', 8) & 32) === 32,
        ignoreStatus: boolProp(element, 'Assertion.assume_success'),
      }
    case 'JSR223Sampler':
    case 'JSR223PreProcessor':
    case 'JSR223PostProcessor':
    case 'JSR223Assertion':
      return { ...common, language: prop(element, 'scriptLanguage', 'groovy'), parameters: prop(element, 'parameters'), scriptFile: prop(element, 'filename'), cache: boolProp(element, 'cacheKey', true), script: prop(element, 'script') }
    default:
      return common
  }
}

function parseComponent(element: Element): TestPlanNode {
  const type = mapElementToType(element)
  const node = createNode(type, element.getAttribute('testname') || element.tagName, parseProperties(element, type))
  node.enabled = element.getAttribute('enabled') !== 'false'
  if (type === 'UnsupportedComponent') {
    node.metadata = {
      originalClass: element.getAttribute('testclass') || element.tagName,
      rawXml: new XMLSerializer().serializeToString(element),
    }
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
    if (testPlan) return testPlan
    return createNode('TestPlan', 'Imported Test Plan', {}, nodes)
  },
}
