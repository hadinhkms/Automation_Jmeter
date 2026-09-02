import type { JMeterComponentType, TableRow, TestPlanNode } from '../models/jmeter'
import { applyRawJmxProperties } from '../utils/jmxRawProperties'
import { typeToElement } from './mappings'

export interface JmxWriter {
  write(testPlan: TestPlanNode): string
}

type XmlDocument = XMLDocument

function escapeXmlAttribute(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
}

function replaceOrAddXmlAttribute(xml: string, name: string, value: string): string {
  const escaped = escapeXmlAttribute(value)
  const existingAttr = new RegExp(`\\s${name}=("[^"]*"|'[^']*')`, 'i')

  if (existingAttr.test(xml)) {
    return xml.replace(existingAttr, ` ${name}="${escaped}"`)
  }

  return xml.replace(/^(\s*<[A-Za-z_][\w:.-]*)(\s|\/?>)/, `$1 ${name}="${escaped}"$2`)
}

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

function editorScopeToJMeterScope(rawScope: unknown): string {
  const scope = String(rawScope || 'main')
  if (scope === 'main-and-sub') return 'all'
  if (scope === 'sub') return 'children'
  if (scope === 'all' || scope === 'children' || scope === 'variable') return scope
  return 'main'
}

function editorRegexFieldToJMeterField(rawField: unknown): string {
  const field = String(rawField || 'body')
  if (field === 'body') return 'false'
  if (field === 'body-unescaped') return 'unescaped'
  if (field === 'headers') return 'true'
  if (field === 'request-headers') return 'request_headers'
  if (field === 'url') return 'URL'
  if (field === 'document') return 'as_document'
  if (field === 'false' || field === 'true' || field === 'unescaped' || field === 'request_headers' || field === 'URL' || field === 'code' || field === 'message' || field === 'as_document') return field
  return 'false'
}

function shouldRebuildFromProperties(node: TestPlanNode): boolean {
  return node.type === 'RegexExtractor' || node.type === 'UserDefinedVariables' || node.type === 'TestPlan'
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
  const fields: Array<{ key: string; property: string; type?: 'bool' }> = [
    { key: 'name', property: 'Argument.name' },
    { key: 'value', property: 'Argument.value' },
    { key: 'metadata', property: 'Argument.metadata' },
    { key: 'encode', property: 'HTTPArgument.always_encode', type: 'bool' },
    { key: 'includeEquals', property: 'HTTPArgument.use_equals', type: 'bool' },
  ]
  if (name === 'TestPlan.user_defined_variables') {
    fields.splice(3, 0, { key: 'description', property: 'Argument.desc' })
  }
  appendCollection(documentNode, args, 'Arguments.arguments', 'HTTPArgument', items, fields)
  parent.appendChild(args)
}

function appendFiles(documentNode: XmlDocument, parent: Element, items: TableRow[]) {
  const filesWrapper = documentNode.createElement('elementProp')
  filesWrapper.setAttribute('name', 'HTTPsampler.Files')
  filesWrapper.setAttribute('elementType', 'HTTPFileArgs')
  filesWrapper.setAttribute('guiclass', 'HTTPFileArgsPanel')
  filesWrapper.setAttribute('testclass', 'HTTPFileArgs')
  filesWrapper.setAttribute('enabled', 'true')
  appendCollection(documentNode, filesWrapper, 'HTTPFileArgs.files', 'HTTPFileArg', items, [
    { key: 'path', property: 'File.path' },
    { key: 'parameterName', property: 'File.paramname' },
    { key: 'mimeType', property: 'File.mimetype' },
  ])
  parent.appendChild(filesWrapper)
}

function appendCommon(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  stringProp(documentNode, element, 'comments', value(node, 'comments'))
}

function appendSaveConfig(
  documentNode: XmlDocument,
  element: Element,
  options: {
    filename?: string
    responseData?: boolean
    samplerData?: boolean
    xml?: boolean
    requestHeaders?: boolean
    responseHeaders?: boolean
  } = {},
) {
  boolProperty(documentNode, element, 'ResultCollector.error_logging', false)
  const saveConfig = documentNode.createElement('objProp')
  const scName = documentNode.createElement('name')
  scName.textContent = 'saveConfig'
  saveConfig.appendChild(scName)

  const scVal = documentNode.createElement('value')
  scVal.setAttribute('class', 'SampleSaveConfiguration')
  const configs: Record<string, boolean | string> = {
    time: true,
    latency: true,
    timestamp: true,
    success: true,
    label: true,
    code: true,
    message: true,
    threadName: true,
    dataType: true,
    encoding: false,
    assertions: true,
    subresults: true,
    responseData: options.responseData ?? false,
    samplerData: options.samplerData ?? false,
    xml: options.xml ?? false,
    fieldNames: true,
    responseHeaders: options.responseHeaders ?? false,
    requestHeaders: options.requestHeaders ?? false,
    responseDataOnError: false,
    saveAssertionResultsFailureMessage: true,
    assertionsResultsToSave: '0',
    bytes: true,
    sentBytes: true,
    url: true,
    threadCounts: true,
    idleTime: true,
    connectTime: true,
  }

  Object.entries(configs).forEach(([k, v]) => {
    const propEl = documentNode.createElement(k)
    propEl.textContent = String(v)
    scVal.appendChild(propEl)
  })

  saveConfig.appendChild(scVal)
  element.appendChild(saveConfig)
  stringProp(documentNode, element, 'filename', options.filename || '')
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
        { key: 'description', property: 'Argument.desc' },
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
    case 'ConcurrencyThreadGroup': {
      stringProp(documentNode, element, 'ThreadGroup.on_sample_error', value(node, 'onError', 'continue'))
      stringProp(documentNode, element, 'TargetLevel', value(node, 'targetConcurrency', 50))
      stringProp(documentNode, element, 'RampUp', value(node, 'rampUpTime', 60))
      stringProp(documentNode, element, 'Steps', value(node, 'rampUpSteps', 5))
      stringProp(documentNode, element, 'Hold', value(node, 'holdRateTime', 300))
      stringProp(documentNode, element, 'LogFilename', value(node, 'logFilename', ''))
      stringProp(documentNode, element, 'Iterations', value(node, 'iterations', ''))
      stringProp(documentNode, element, 'Unit', value(node, 'timeUnit', 'S'))
      break
    }
    case 'SteppingThreadGroup': {
      stringProp(documentNode, element, 'ThreadGroup.on_sample_error', value(node, 'onError', 'continue'))
      stringProp(documentNode, element, 'ThreadGroup.num_threads', value(node, 'numThreads', 100))
      stringProp(documentNode, element, 'Threads initial delay', value(node, 'firstWaitSeconds', 0))
      stringProp(documentNode, element, 'Start users count', value(node, 'initialThreads', 10))
      stringProp(documentNode, element, 'Start users count burst', value(node, 'thenAddThreads', 10))
      stringProp(documentNode, element, 'Start users period', value(node, 'everySeconds', 30))
      stringProp(documentNode, element, 'flighttime', value(node, 'holdSeconds', 300))
      stringProp(documentNode, element, 'rampUp', value(node, 'rampUpSeconds', 5))
      stringProp(documentNode, element, 'Stop users count', value(node, 'thenStopThreads', 5))
      stringProp(documentNode, element, 'Stop users period', value(node, 'stopEverySeconds', 5))
      break
    }
    case 'UltimateThreadGroup': {
      stringProp(documentNode, element, 'ThreadGroup.on_sample_error', value(node, 'onError', 'continue'))
      const scheduleRows = rows(node, 'scheduleRows')
      const collection = documentNode.createElement('collectionProp')
      collection.setAttribute('name', 'ultimatethreadgroupdata')
      scheduleRows.forEach((row, index) => {
        const item = documentNode.createElement('collectionProp')
        item.setAttribute('name', String(index))
        stringProp(documentNode, item, '0', row.startThreads || '100')
        stringProp(documentNode, item, '1', row.initialDelay || '0')
        stringProp(documentNode, item, '2', row.startupTime || '30')
        stringProp(documentNode, item, '3', row.holdLoadTime || '300')
        stringProp(documentNode, item, '4', row.shutdownTime || '10')
        collection.appendChild(item)
      })
      element.appendChild(collection)
      break
    }
    case 'GraphQLSampler': {
      const query = String(value(node, 'query', ''))
      const variables = String(value(node, 'variables', ''))
      const opName = String(value(node, 'operationName', ''))
      let bodyPayload = ''
      try {
        const parsedVars = variables ? JSON.parse(variables) : {}
        bodyPayload = JSON.stringify({ query, variables: parsedVars, operationName: opName || undefined }, null, 2)
      } catch {
        bodyPayload = JSON.stringify({ query, operationName: opName || undefined }, null, 2)
      }
      const parameters = [{ name: '', value: bodyPayload, metadata: '=', encode: false, includeEquals: true }]
      appendArguments(documentNode, element, parameters)
      stringProp(documentNode, element, 'HTTPSampler.domain', value(node, 'server'))
      stringProp(documentNode, element, 'HTTPSampler.port', value(node, 'port'))
      stringProp(documentNode, element, 'HTTPSampler.protocol', value(node, 'protocol', 'https'))
      stringProp(documentNode, element, 'HTTPSampler.path', value(node, 'path', '/graphql'))
      stringProp(documentNode, element, 'HTTPSampler.method', 'POST')
      boolProperty(documentNode, element, 'HTTPSampler.follow_redirects', true)
      boolProperty(documentNode, element, 'HTTPSampler.use_keepalive', true)
      boolProperty(documentNode, element, 'HTTPSampler.postBodyRaw', true)
      break
    }
    case 'WebSocketOpenSampler': {
      stringProp(documentNode, element, 'serverAddress', value(node, 'server', ''))
      stringProp(documentNode, element, 'serverPort', value(node, 'port', '443'))
      stringProp(documentNode, element, 'contextPath', value(node, 'path', '/ws'))
      stringProp(documentNode, element, 'connectionTimeout', value(node, 'connectTimeout', 20000))
      stringProp(documentNode, element, 'readTimeout', value(node, 'readTimeout', 6000))
      boolProperty(documentNode, element, 'TLS', value(node, 'protocol', 'wss') === 'wss')
      break
    }
    case 'WebSocketSingleWriteSampler': {
      stringProp(documentNode, element, 'requestData', value(node, 'requestData', ''))
      stringProp(documentNode, element, 'dataType', value(node, 'dataType', 'Text'))
      boolProperty(documentNode, element, 'createNewConnection', value(node, 'createNewConnection', false))
      break
    }
    case 'WebSocketSingleReadSampler': {
      stringProp(documentNode, element, 'readTimeout', value(node, 'readTimeout', 6000))
      stringProp(documentNode, element, 'dataType', value(node, 'dataType', 'Text'))
      boolProperty(documentNode, element, 'createNewConnection', value(node, 'createNewConnection', false))
      break
    }
    case 'WebSocketCloseSampler': {
      stringProp(documentNode, element, 'statusCode', value(node, 'statusCode', 1000))
      stringProp(documentNode, element, 'closeReason', value(node, 'closeReason', 'Normal Closure'))
      break
    }
    case 'BackendListener': {
      stringProp(documentNode, element, 'classname', value(node, 'classname', 'org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender'))
      const args = documentNode.createElement('elementProp')
      args.setAttribute('name', 'arguments')
      args.setAttribute('elementType', 'Arguments')
      args.setAttribute('guiclass', 'ArgumentsPanel')
      args.setAttribute('testclass', 'Arguments')
      args.setAttribute('enabled', 'true')
      const backendArgs: TableRow[] = [
        { name: 'influxdbMetricsSender', value: 'org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender' },
        { name: 'influxdbUrl', value: String(value(node, 'influxdbUrl', 'http://localhost:8086/api/v2/write?org=org&bucket=jmeter')) },
        { name: 'application', value: String(value(node, 'application', 'jmeter-load-test')) },
        { name: 'measurement', value: String(value(node, 'measurement', 'jmeter')) },
        { name: 'summaryOnly', value: String(value(node, 'summaryOnly', 'false')) },
        { name: 'samplersRegex', value: String(value(node, 'samplersRegex', '.*')) },
        { name: 'percentiles', value: String(value(node, 'percentiles', '90;95;99')) },
        { name: 'testTitle', value: String(value(node, 'testTitle', 'JMeter Studio Test')) },
      ]
      appendCollection(documentNode, args, 'Arguments.arguments', 'Argument', backendArgs, [
        { key: 'name', property: 'Argument.name' },
        { key: 'value', property: 'Argument.value' },
        { key: 'metadata', property: 'Argument.metadata' },
      ])
      element.appendChild(args)
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
      const rawPath = String(value(node, 'path') || '')
      const paramRows = rows(node, 'parameters')

      // Encode spaces to %20 to avoid java.net.URISyntaxException
      const cleanPath = rawPath.replace(/ /g, '%20')

      const isRawBody = Boolean(value(node, 'postBodyRaw', Boolean(body)))
      const parameters = isRawBody && body
        ? [{ name: '', value: body, metadata: '=', encode: false, includeEquals: true }]
        : paramRows.map((row) => {
            const val = String(row.value ?? '')
            const mustEncode =
              row.encode === true ||
              row.encode === undefined ||
              val.includes(' ') ||
              val.includes('"') ||
              val.includes('(') ||
              val.includes(')') ||
              val.includes('[') ||
              val.includes(']')
            return {
              ...row,
              metadata: '=',
              includeEquals: true,
              encode: mustEncode,
            }
          })

      appendArguments(documentNode, element, parameters)
      stringProp(documentNode, element, 'HTTPSampler.domain', value(node, 'server'))
      stringProp(documentNode, element, 'HTTPSampler.port', value(node, 'port'))
      stringProp(documentNode, element, 'HTTPSampler.protocol', value(node, 'protocol'))
      stringProp(documentNode, element, 'HTTPSampler.contentEncoding', value(node, 'contentEncoding'))
      stringProp(documentNode, element, 'HTTPSampler.path', cleanPath)
      stringProp(documentNode, element, 'HTTPSampler.method', value(node, 'method', 'GET'))
      boolProperty(documentNode, element, 'HTTPSampler.follow_redirects', value(node, 'followRedirects', true))
      boolProperty(documentNode, element, 'HTTPSampler.auto_redirects', value(node, 'autoRedirects', false))
      boolProperty(documentNode, element, 'HTTPSampler.use_keepalive', value(node, 'keepAlive', true))
      boolProperty(documentNode, element, 'HTTPSampler.DO_MULTIPART_POST', value(node, 'multipart', false))
      boolProperty(documentNode, element, 'HTTPSampler.BROWSER_COMPATIBLE_MULTIPART', value(node, 'browserCompatible', false))
      boolProperty(documentNode, element, 'HTTPSampler.postBodyRaw', isRawBody)
      appendFiles(documentNode, element, rows(node, 'files'))
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
    case 'JSONExtractor': {
      const scope = String(value(node, 'scope', value(node, 'applyTo', 'main')))
      const scopeVariable = String(value(node, 'scopeVariable', ''))
      if (scope && scope !== 'main') {
        stringProp(documentNode, element, 'Sample.scope', scope)
      }
      if (scope === 'variable' && scopeVariable) {
        stringProp(documentNode, element, 'Scope.variable', scopeVariable)
      }
      stringProp(documentNode, element, 'JSONPostProcessor.referenceNames', value(node, 'variableNames'))
      stringProp(documentNode, element, 'JSONPostProcessor.jsonPathExprs', value(node, 'jsonPaths'))
      stringProp(documentNode, element, 'JSONPostProcessor.match_numbers', value(node, 'matchNumbers', '1'))
      boolProperty(documentNode, element, 'JSONPostProcessor.compute_concat', value(node, 'computeConcat', false))
      stringProp(documentNode, element, 'JSONPostProcessor.defaultValues', value(node, 'defaults'))
      break
    }
    case 'RegexExtractor': {
      const scope = editorScopeToJMeterScope(value(node, 'scope', value(node, 'applyTo', 'main')))
      const scopeVariable = String(value(node, 'scopeVariable', ''))
      if (scope !== 'main') {
        stringProp(documentNode, element, 'Sample.scope', scope)
      }
      if (scope === 'variable' && scopeVariable) {
        stringProp(documentNode, element, 'Scope.variable', scopeVariable)
      }
      stringProp(documentNode, element, 'RegexExtractor.useHeaders', editorRegexFieldToJMeterField(value(node, 'field', 'body')))
      stringProp(documentNode, element, 'RegexExtractor.refname', value(node, 'referenceName'))
      stringProp(documentNode, element, 'RegexExtractor.regex', value(node, 'regex'))
      stringProp(documentNode, element, 'RegexExtractor.template', value(node, 'template', '$1$'))
      stringProp(documentNode, element, 'RegexExtractor.match_number', value(node, 'matchNumber', 1))
      stringProp(documentNode, element, 'RegexExtractor.default', value(node, 'defaultValue'))
      boolProperty(documentNode, element, 'RegexExtractor.default_empty_value', value(node, 'emptyDefault', false))
      break
    }
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
    case 'DebugSampler':
      boolProperty(documentNode, element, 'displayJMeterProperties', value(node, 'displayJMeterProperties', false))
      boolProperty(documentNode, element, 'displayJMeterVariables', value(node, 'displayJMeterVariables', true))
      boolProperty(documentNode, element, 'displaySamplerProperties', value(node, 'displaySamplerProperties', false))
      boolProperty(documentNode, element, 'displaySystemProperties', value(node, 'displaySystemProperties', false))
      break
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
    case 'ModuleController': {
      const nodePath = value(node, 'nodePath', '')
      const collection = documentNode.createElement('collectionProp')
      collection.setAttribute('name', 'ModuleController.node_path')
      if (nodePath) {
        const parts = String(nodePath).split(',').filter(p => p.trim())
        parts.forEach((part) => {
          const element = documentNode.createElement('stringProp')
          element.textContent = part.trim()
          collection.appendChild(element)
        })
      }
      element.appendChild(collection)
      break
    }
    case 'TestFragmentController':
      // TestFragmentController is just a container, no special properties needed
      break
    case 'BeanShellPostProcessor':
      stringProp(documentNode, element, 'script', value(node, 'script'))
      stringProp(documentNode, element, 'parameters', value(node, 'parameters'))
      stringProp(documentNode, element, 'filename', value(node, 'filename'))
      break
    case 'ViewResultsTree':
      appendSaveConfig(documentNode, element, {
        filename: String(value(node, 'filename', 'vrt_results.xml') || 'vrt_results.xml'),
        responseData: true,
        samplerData: true,
        xml: true,
        requestHeaders: true,
        responseHeaders: true,
      })
      break
    case 'SummaryReport':
    case 'AggregateReport':
      appendSaveConfig(documentNode, element, {
        filename: String(value(node, 'filename', '') || ''),
      })
      break
  }

  return element
}

function serializeNodeWithPreservation(node: TestPlanNode, indent = 0): string {
  const spaces = ' '.repeat(indent)
  let xml = ''

  if (node.metadata?.rawXml && !shouldRebuildFromProperties(node)) {
    const rawProperties = node.properties.rawProperties
    xml = node.type === 'UnsupportedComponent' && Array.isArray(rawProperties)
      ? applyRawJmxProperties(node.metadata.rawXml, rawProperties)
      : node.metadata.rawXml
    xml = replaceOrAddXmlAttribute(xml, 'testname', node.name)
    xml = replaceOrAddXmlAttribute(xml, 'enabled', String(node.enabled))
  } else {
    const documentNode = document.implementation.createDocument('', '', null)
    const element = node.type !== 'UnsupportedComponent'
      ? createKnownComponent(documentNode, node, node.type)
      : documentNode.createElement(node.metadata?.originalClass || 'UnsupportedComponent')

    if (node.type === 'UnsupportedComponent') {
      element.setAttribute('testname', node.name)
      element.setAttribute('enabled', String(node.enabled))
    }

    xml = new XMLSerializer().serializeToString(element)
  }

  let result = `${spaces}${xml.trim()}\n${spaces}<hashTree>\n`
  node.children.forEach((child) => {
    result += serializeNodeWithPreservation(child, indent + 2)
  })
  result += `${spaces}</hashTree>\n`

  return result
}

export const browserJmxWriter: JmxWriter = {
  write(testPlan) {
    const header = '<?xml version="1.0" encoding="UTF-8"?>\n<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">\n  <hashTree>\n'
    const body = serializeNodeWithPreservation(testPlan, 4)
    const footer = '  </hashTree>\n</jmeterTestPlan>'
    return header + body + footer
  },
}
