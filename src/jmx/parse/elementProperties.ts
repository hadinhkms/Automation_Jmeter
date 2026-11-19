import { boolProp, collectionRows, namedElement, numProp, prop } from './domReaders'
import { assertionMatchType, assertionScopeToEditorValue, regexFieldToEditorValue, sampleScopeToEditorValue } from './editorValues'
import type { ParsedProperties, PropertyParser } from './types'
import { shareModeFromJmx } from '../../utils/ddt/csvShareMode'

const COOKIE_FIELDS = {
  name: 'Cookie.name',
  value: 'Cookie.value',
  domain: 'Cookie.domain',
  path: 'Cookie.path',
  secure: 'Cookie.secure',
  expires: 'Cookie.expires',
}

function backendListenerProperties(element: Element, common: ParsedProperties): ParsedProperties {
  const backendArgs = collectionRows(element, 'Arguments.arguments', {
    name: 'Argument.name',
    value: 'Argument.value',
  })
  // SAFETY: Argument rows are parsed from stringProp values, so value is a string
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

/** Config elements and backend listener. */
export const parseConfigProperties: PropertyParser = (element, type, common) => {
  switch (type) {
    case 'BackendListener':
      return backendListenerProperties(element, common)
    case 'HTTPHeaderManager':
      return {
        ...common,
        headers: collectionRows(element, 'HeaderManager.headers', { name: 'Header.name', value: 'Header.value' }),
      }
    case 'HTTPCookieManager':
      return {
        ...common,
        clearEachIteration: boolProp(element, 'CookieManager.clearEachIteration'),
        controlledByThreadGroup: boolProp(element, 'CookieManager.controlledByThreadGroup'),
        cookies: collectionRows(element, 'CookieManager.cookies', COOKIE_FIELDS),
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
        ...shareModeFromJmx(prop(element, 'shareMode', 'shareMode.all')),
      }
    default:
      return undefined
  }
}

/** Logic controllers, timers and script-only components. */
export const parseControllerProperties: PropertyParser = (element, type, common) => {
  switch (type) {
    case 'TransactionController':
      return {
        ...common,
        generateParent: boolProp(element, 'TransactionController.parent'),
        includeTimers: boolProp(element, 'TransactionController.includeTimers'),
      }
    case 'IfController':
      return {
        ...common,
        condition: prop(element, 'IfController.condition'),
        interpretExpression: !boolProp(element, 'IfController.useExpression'),
        evaluateAll: boolProp(element, 'IfController.evaluateAll'),
      }
    case 'LoopController':
      return {
        ...common,
        loops: numProp(element, 'LoopController.loops', 1),
        forever: boolProp(element, 'LoopController.continue_forever'),
      }
    case 'WhileController':
      return { ...common, condition: prop(element, 'WhileController.condition') }
    case 'ConstantTimer':
      return { ...common, delay: numProp(element, 'ConstantTimer.delay', 0) }
    case 'ModuleController':
      return { ...common, nodePath: prop(element, 'ModuleController.node_path') }
    case 'TestFragmentController':
      return { ...common }
    case 'BeanShellPostProcessor':
      return {
        ...common,
        script: prop(element, 'script'),
        parameters: prop(element, 'parameters'),
        filename: prop(element, 'filename'),
      }
    default:
      return undefined
  }
}

/** Post-processor extractors and assertions. */
export const parseExtractorProperties: PropertyParser = (element, type, common) => {
  switch (type) {
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
    case 'ResponseAssertion': {
      const rawField = prop(element, 'Assertion.test_field', 'Assertion.response_code')
      const patternItems = Array.from(namedElement(element, 'Asserion.test_strings')?.children ?? [])
      return {
        ...common,
        applyTo: assertionScopeToEditorValue(prop(element, 'Sample.scope', 'main')),
        scopeVariable: prop(element, 'Scope.variable', ''),
        field: rawField.replace('Assertion.', '').replace('_', '-'),
        matchType: assertionMatchType(element),
        patterns: patternItems.map((item) => ({ pattern: item.textContent ?? '' })),
        not: (numProp(element, 'Assertion.test_type', 8) & 4) === 4,
        or: (numProp(element, 'Assertion.test_type', 8) & 32) === 32,
        ignoreStatus: boolProp(element, 'Assertion.assume_success'),
      }
    }
    case 'JSONPathAssertion':
      return {
        ...common,
        jsonPath: prop(element, 'JSON_PATH'),
        expectedValue: prop(element, 'EXPECTED_VALUE'),
        jsonValidation: boolProp(element, 'JSONVALIDATION', true),
        expectNull: boolProp(element, 'EXPECT_NULL', false),
        invert: boolProp(element, 'INVERT', false),
        isRegex: boolProp(element, 'ISREGEX', false),
      }
    default:
      return undefined
  }
}
