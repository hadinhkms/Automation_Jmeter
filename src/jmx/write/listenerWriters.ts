import type { TableRow, TestPlanNode } from '../../models/jmeter'
import { PLAIN_ARGUMENT_FIELDS } from './argumentWriters'
import type { ComponentWriter } from './types'
import { appendCollection, boolProperty, createElementProp, stringProp, value } from './xmlPrimitives'
import type { XmlDocument } from './xmlPrimitives'

type SaveConfigOptions = {
  filename?: string
  responseData?: boolean
  samplerData?: boolean
  xml?: boolean
  requestHeaders?: boolean
  responseHeaders?: boolean
}

function saveConfigValues(options: SaveConfigOptions): Record<string, boolean | string> {
  return {
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
}

function appendSaveConfig(documentNode: XmlDocument, element: Element, options: SaveConfigOptions = {}) {
  boolProperty(documentNode, element, 'ResultCollector.error_logging', false)
  const saveConfig = documentNode.createElement('objProp')
  const scName = documentNode.createElement('name')
  scName.textContent = 'saveConfig'
  saveConfig.appendChild(scName)

  const scVal = documentNode.createElement('value')
  scVal.setAttribute('class', 'SampleSaveConfiguration')
  Object.entries(saveConfigValues(options)).forEach(([k, v]) => {
    const propEl = documentNode.createElement(k)
    propEl.textContent = String(v)
    scVal.appendChild(propEl)
  })

  saveConfig.appendChild(scVal)
  element.appendChild(saveConfig)
  stringProp(documentNode, element, 'filename', options.filename || '')
}

const INFLUX_SENDER = 'org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender'

function writeBackendListener(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  stringProp(documentNode, element, 'classname', value(node, 'classname', INFLUX_SENDER))
  const args = createElementProp(documentNode, 'arguments', 'Arguments', 'ArgumentsPanel', 'Arguments')
  args.setAttribute('enabled', 'true')
  const arg = (name: string, fallback: string) => ({ name, value: String(value(node, name, fallback)) })
  const backendArgs: TableRow[] = [
    { name: 'influxdbMetricsSender', value: INFLUX_SENDER },
    arg('influxdbUrl', 'http://localhost:8086/api/v2/write?org=org&bucket=jmeter'),
    arg('application', 'jmeter-load-test'),
    arg('measurement', 'jmeter'),
    arg('summaryOnly', 'false'),
    arg('samplersRegex', '.*'),
    arg('percentiles', '90;95;99'),
    arg('testTitle', 'JMeter Studio Test'),
  ]
  appendCollection(documentNode, args, 'Arguments.arguments', 'Argument', backendArgs, PLAIN_ARGUMENT_FIELDS)
  element.appendChild(args)
}

/** Backend listener and result collectors (View Results Tree, Summary / Aggregate reports). */
export const writeListenerComponent: ComponentWriter = (documentNode, element, node, type) => {
  switch (type) {
    case 'BackendListener':
      writeBackendListener(documentNode, element, node)
      return true
    case 'ViewResultsTree':
      appendSaveConfig(documentNode, element, {
        filename: String(value(node, 'filename', 'vrt_results.xml') || 'vrt_results.xml'),
        responseData: true,
        samplerData: true,
        xml: true,
        requestHeaders: true,
        responseHeaders: true,
      })
      return true
    case 'SummaryReport':
    case 'AggregateReport':
      appendSaveConfig(documentNode, element, {
        filename: String(value(node, 'filename', '') || ''),
      })
      return true
    default:
      return false
  }
}
