import type { JMeterComponentType } from '../../models/jmeter'

/** Default properties for config elements, controllers, timers, extractors, assertions and scripts. Returns undefined for types handled elsewhere. */
export function configDefaults(
  type: JMeterComponentType,
  common: { comments: string },
): Record<string, unknown> | undefined {
  switch (type) {
    case 'HTTPRequestDefaults':
      return {
        ...common,
        protocol: 'https',
        server: '',
        port: '',
        path: '',
        contentEncoding: '',
      }
    case 'HTTPHeaderManager':
      return { ...common, headers: [{ name: 'Content-Type', value: 'application/json' }] }
    case 'HTTPCookieManager':
      return { ...common, clearEachIteration: false, controlledByThreadGroup: false, cookies: [] }
    case 'CSVDataSet':
      return {
        ...common,
        filename: '',
        encoding: 'UTF-8',
        variableNames: '',
        ignoreFirstLine: false,
        delimiter: ',',
        quotedData: false,
        recycle: true,
        stopThread: false,
        sharingMode: 'shareMode.all',
        identifier: '',
      }
    case 'TransactionController':
      return { ...common, generateParent: false, includeTimers: false }
    case 'IfController':
      return { ...common, condition: '', interpretExpression: true, evaluateAll: false }
    case 'LoopController':
      return { ...common, loops: 1, forever: false }
    case 'WhileController':
      return { ...common, condition: '' }
    case 'ConstantTimer':
      return { ...common, delay: 300 }
    case 'JSONExtractor':
      return {
        ...common,
        scope: 'main',
        applyTo: 'main',
        scopeVariable: '',
        variableNames: '',
        jsonPaths: '',
        matchNumbers: '1',
        computeConcat: false,
        defaults: '',
      }
    case 'RegexExtractor':
      return {
        ...common,
        applyTo: 'main',
        field: 'body',
        referenceName: '',
        regex: '',
        template: '$1$',
        matchNumber: 1,
        defaultValue: '',
        emptyDefault: false,
      }
    case 'ResponseAssertion':
      return {
        ...common,
        applyTo: 'main-and-sub',
        field: 'response-code',
        matchType: 'equals',
        patterns: [{ pattern: '200' }],
        not: false,
        or: false,
        ignoreStatus: false,
      }
    case 'JSONPathAssertion':
      return {
        ...common,
        jsonPath: '$.code',
        expectedValue: '200',
        jsonValidation: true,
        expectNull: false,
        invert: false,
        isRegex: false,
      }
    case 'DebugSampler':
      return {
        ...common,
        displayJMeterProperties: false,
        displayJMeterVariables: true,
        displaySamplerProperties: false,
        displaySystemProperties: false,
      }
    case 'JSR223Sampler':
    case 'JSR223PreProcessor':
    case 'JSR223PostProcessor':
    case 'JSR223Assertion':
      return { ...common, language: 'groovy', parameters: '', scriptFile: '', cache: true, script: '' }
    default:
      return undefined
  }
}
