import type { JMeterComponentType, TableRow, TestPlanNode } from '../models/jmeter'
import { createNode } from '../mock/sampleTestPlan'
import { normalizeDirectoryVariableRows } from '../utils/jmeterPathVariables'
import { parseRawJmxProperties } from '../utils/jmxRawProperties'
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

function sampleScopeToEditorValue(rawScope: string): string {
  const scope = rawScope.trim()
  if (scope === 'all' || scope === 'main-and-sub') return 'all'
  if (scope === 'children' || scope === 'sub') return 'children'
  if (scope === 'variable') return 'variable'
  return 'main'
}

function regexFieldToEditorValue(rawField: string): string {
  const field = rawField.trim()
  const normalized = field.toLowerCase()

  if (!field || normalized === 'false' || normalized === 'body') return 'body'
  if (normalized === 'unescaped' || normalized === 'body-unescaped') return 'body-unescaped'
  if (normalized === 'true' || normalized === 'headers') return 'headers'
  if (normalized === 'request_headers' || normalized === 'request-headers') return 'request-headers'
  if (normalized === 'url') return 'url'
  if (normalized === 'code') return 'code'
  if (normalized === 'message') return 'message'
  if (normalized === 'as_document' || normalized === 'document') return 'document'
  return 'body'
}

function parseProperties(element: Element, type: JMeterComponentType): Record<string, unknown> {
  const common = { comments: comments(element) }
  switch (type) {
    case 'TestPlan':
      return {
        ...common,
        variables: normalizeDirectoryVariableRows(collectionRows(element, 'Arguments.arguments', { name: 'Argument.name', value: 'Argument.value', description: 'Argument.desc' })),
        functionalMode: boolProp(element, 'TestPlan.functional_mode'),
        tearDownAfterShutdown: boolProp(element, 'TestPlan.tearDown_on_shutdown', true),
        serializeThreadGroups: boolProp(element, 'TestPlan.serialize_threadgroups'),
      }
    case 'UserDefinedVariables':
      return { ...common, variables: normalizeDirectoryVariableRows(collectionRows(element, 'Arguments.arguments', { name: 'Argument.name', value: 'Argument.value', description: 'Argument.desc' })) }
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
    case 'ConcurrencyThreadGroup':
      return {
        ...common,
        onError: prop(element, 'ThreadGroup.on_sample_error', 'continue'),
        targetConcurrency: numProp(element, 'TargetLevel', 50),
        rampUpTime: numProp(element, 'RampUp', 60),
        rampUpSteps: numProp(element, 'Steps', 5),
        holdRateTime: numProp(element, 'Hold', 300),
        logFilename: prop(element, 'LogFilename', ''),
        iterations: prop(element, 'Iterations', ''),
        timeUnit: prop(element, 'Unit', 'S'),
      }
    case 'SteppingThreadGroup':
      return {
        ...common,
        onError: prop(element, 'ThreadGroup.on_sample_error', 'continue'),
        numThreads: numProp(element, 'ThreadGroup.num_threads', 100),
        firstWaitSeconds: numProp(element, 'Threads initial delay', 0),
        initialThreads: numProp(element, 'Start users count', 10),
        thenAddThreads: numProp(element, 'Start users count burst', 10),
        everySeconds: numProp(element, 'Start users period', 30),
        holdSeconds: numProp(element, 'flighttime', 300),
        rampUpSeconds: numProp(element, 'rampUp', 5),
        thenStopThreads: numProp(element, 'Stop users count', 5),
        stopEverySeconds: numProp(element, 'Stop users period', 5),
      }
    case 'UltimateThreadGroup': {
      const scheduleCollection = namedElement(element, 'ultimatethreadgroupdata')
      const scheduleRows: TableRow[] = []
      if (scheduleCollection) {
        Array.from(scheduleCollection.children).forEach((coll) => {
          const startThreads = Array.from(coll.children).find((c) => c.getAttribute('name') === '0')?.textContent || '100'
          const initialDelay = Array.from(coll.children).find((c) => c.getAttribute('name') === '1')?.textContent || '0'
          const startupTime = Array.from(coll.children).find((c) => c.getAttribute('name') === '2')?.textContent || '30'
          const holdLoadTime = Array.from(coll.children).find((c) => c.getAttribute('name') === '3')?.textContent || '300'
          const shutdownTime = Array.from(coll.children).find((c) => c.getAttribute('name') === '4')?.textContent || '10'
          scheduleRows.push({ startThreads, initialDelay, startupTime, holdLoadTime, shutdownTime })
        })
      }
      return {
        ...common,
        onError: prop(element, 'ThreadGroup.on_sample_error', 'continue'),
        scheduleRows: scheduleRows.length > 0 ? scheduleRows : [
          { startThreads: '100', initialDelay: '0', startupTime: '30', holdLoadTime: '300', shutdownTime: '10' },
        ],
      }
    }
    case 'GraphQLSampler': {
      const argumentRows = collectionRows(element, 'Arguments.arguments', {
        name: 'Argument.name',
        value: 'Argument.value',
      })
      let query = ''
      let variables = ''
      let operationName = ''
      if (argumentRows.length > 0) {
        try {
          const parsed = JSON.parse(String(argumentRows[0].value || '{}'))
          query = parsed.query || ''
          variables = typeof parsed.variables === 'object' ? JSON.stringify(parsed.variables, null, 2) : String(parsed.variables || '')
          operationName = parsed.operationName || ''
        } catch {
          query = String(argumentRows[0].value || '')
        }
      }
      return {
        ...common,
        protocol: prop(element, 'HTTPSampler.protocol', 'https'),
        server: prop(element, 'HTTPSampler.domain'),
        port: prop(element, 'HTTPSampler.port'),
        path: prop(element, 'HTTPSampler.path', '/graphql'),
        query,
        variables,
        operationName,
      }
    }
    case 'WebSocketOpenSampler':
      return {
        ...common,
        server: prop(element, 'serverAddress'),
        port: prop(element, 'serverPort', '443'),
        path: prop(element, 'contextPath', '/ws'),
        protocol: boolProp(element, 'TLS', true) ? 'wss' : 'ws',
        connectTimeout: numProp(element, 'connectionTimeout', 20000),
        readTimeout: numProp(element, 'readTimeout', 6000),
      }
    case 'WebSocketSingleWriteSampler':
      return {
        ...common,
        requestData: prop(element, 'requestData'),
        dataType: prop(element, 'dataType', 'Text'),
        createNewConnection: boolProp(element, 'createNewConnection', false),
      }
    case 'WebSocketSingleReadSampler':
      return {
        ...common,
        readTimeout: numProp(element, 'readTimeout', 6000),
        dataType: prop(element, 'dataType', 'Text'),
        createNewConnection: boolProp(element, 'createNewConnection', false),
      }
    case 'WebSocketCloseSampler':
      return {
        ...common,
        statusCode: numProp(element, 'statusCode', 1000),
        closeReason: prop(element, 'closeReason', 'Normal Closure'),
      }
    case 'BackendListener': {
      const backendArgs = collectionRows(element, 'Arguments.arguments', {
        name: 'Argument.name',
        value: 'Argument.value',
      })
      const getArg = (name: string, fallback = '') => (backendArgs.find((a) => a.name === name)?.value as string) || fallback
      return {
        ...common,
        classname: prop(element, 'classname', 'org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender'),
        influxdbUrl: getArg('influxdbUrl', 'http://localhost:8086/api/v2/write?org=org&bucket=jmeter'),
        application: getArg('application', 'jmeter-load-test'),
        measurement: getArg('measurement', 'jmeter'),
        summaryOnly: getArg('summaryOnly', 'false') === 'true',
        samplersRegex: getArg('samplersRegex', '.*'),
        percentiles: getArg('percentiles', '90;95;99'),
        testTitle: getArg('testTitle', 'JMeter Studio Test'),
      }
    }
    case 'HTTPRequest': {
      const argumentRows = collectionRows(element, 'Arguments.arguments', {
        name: 'Argument.name',
        value: 'Argument.value',
        encode: 'HTTPArgument.always_encode',
        includeEquals: 'HTTPArgument.use_equals',
      })
      const parameters = argumentRows.map((row) => ({
        ...row,
        encode: Boolean(
          row.encode === true ||
          row.encode === 'true' ||
          (typeof row.value === 'string' && (row.value.includes(' ') || row.value.includes('"')))
        ),
      }))
      const rawBody = boolProp(element, 'HTTPSampler.postBodyRaw')
      const body = rawBody && argumentRows.length > 0
        ? String(argumentRows[0].value ?? '')
        : ''
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
        postBodyRaw: rawBody,
        body,
        parameters: rawBody ? [] : parameters,
        files: collectionRows(element, 'HTTPFileArgs.files', { path: 'File.path', parameterName: 'File.paramname', mimeType: 'File.mimetype' }).length > 0
          ? collectionRows(element, 'HTTPFileArgs.files', { path: 'File.path', parameterName: 'File.paramname', mimeType: 'File.mimetype' })
          : collectionRows(element, 'HTTPsampler.Files', { path: 'File.path', parameterName: 'File.paramname', mimeType: 'File.mimetype' }),
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
      return {
        ...common,
        scope: prop(element, 'Sample.scope', 'main'),
        applyTo: prop(element, 'Sample.scope', 'main'),
        scopeVariable: prop(element, 'Scope.variable', ''),
        variableNames: prop(element, 'JSONPostProcessor.referenceNames'),
        jsonPaths: prop(element, 'JSONPostProcessor.jsonPathExprs'),
        matchNumbers: prop(element, 'JSONPostProcessor.match_numbers', '1'),
        computeConcat: boolProp(element, 'JSONPostProcessor.compute_concat'),
        defaults: prop(element, 'JSONPostProcessor.defaultValues'),
      }
    case 'RegexExtractor': {
      const applyTo = sampleScopeToEditorValue(prop(element, 'Sample.scope', 'main'))
      return {
        ...common,
        scope: applyTo,
        applyTo,
        scopeVariable: prop(element, 'Scope.variable', ''),
        field: regexFieldToEditorValue(prop(element, 'RegexExtractor.useHeaders', 'false')),
        referenceName: prop(element, 'RegexExtractor.refname'),
        regex: prop(element, 'RegexExtractor.regex'),
        template: prop(element, 'RegexExtractor.template', '$1$'),
        matchNumber: numProp(element, 'RegexExtractor.match_number', 1),
        defaultValue: prop(element, 'RegexExtractor.default'),
        emptyDefault: boolProp(element, 'RegexExtractor.default_empty_value'),
      }
    }
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
    case 'DebugSampler':
      return {
        ...common,
        displayJMeterProperties: boolProp(element, 'displayJMeterProperties', false),
        displayJMeterVariables: boolProp(element, 'displayJMeterVariables', true),
        displaySamplerProperties: boolProp(element, 'displaySamplerProperties', false),
        displaySystemProperties: boolProp(element, 'displaySystemProperties', false),
      }
    case 'JSR223Sampler':
    case 'JSR223PreProcessor':
    case 'JSR223PostProcessor':
    case 'JSR223Assertion':
      return { ...common, language: prop(element, 'scriptLanguage', 'groovy'), parameters: prop(element, 'parameters'), scriptFile: prop(element, 'filename'), cache: boolProp(element, 'cacheKey', true), script: prop(element, 'script') }
    case 'ModuleController':
      return { ...common, nodePath: prop(element, 'ModuleController.node_path') }
    case 'TestFragmentController':
      return { ...common }
    case 'BeanShellPostProcessor':
      return { ...common, script: prop(element, 'script'), parameters: prop(element, 'parameters'), filename: prop(element, 'filename') }
    default:
      return common
  }
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
