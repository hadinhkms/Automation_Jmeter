import type { JMeterComponentType, TestPlanNode } from '../models/jmeter'
import { createId } from '../utils/ids'

const names: Record<JMeterComponentType, string> = {
  TestPlan: 'Test Plan',
  UserDefinedVariables: 'User Defined Variables',
  ThreadGroup: 'Thread Group',
  HTTPRequestDefaults: 'HTTP Request Defaults',
  HTTPRequest: 'HTTP Request',
  HTTPHeaderManager: 'HTTP Header Manager',
  HTTPCookieManager: 'HTTP Cookie Manager',
  CSVDataSet: 'CSV Data Set Config',
  TransactionController: 'Transaction Controller',
  IfController: 'If Controller',
  LoopController: 'Loop Controller',
  ConstantTimer: 'Constant Timer',
  JSONExtractor: 'JSON Extractor',
  RegexExtractor: 'Regular Expression Extractor',
  ResponseAssertion: 'Response Assertion',
  JSR223Sampler: 'JSR223 Sampler',
  JSR223PreProcessor: 'JSR223 PreProcessor',
  JSR223PostProcessor: 'JSR223 PostProcessor',
  JSR223Assertion: 'JSR223 Assertion',
  ViewResultsTree: 'View Results Tree',
  SummaryReport: 'Summary Report',
  AggregateReport: 'Aggregate Report',
  UnsupportedComponent: 'Unsupported Component',
}

export function defaultProperties(
  type: JMeterComponentType,
): Record<string, unknown> {
  const common = { comments: '' }
  switch (type) {
    case 'TestPlan':
      return {
        ...common,
        variables: [],
        functionalMode: false,
        tearDownAfterShutdown: true,
        serializeThreadGroups: false,
      }
    case 'UserDefinedVariables':
      return { ...common, variables: [{ name: 'baseUrl', value: 'https://api.example.com' }] }
    case 'ThreadGroup':
      return {
        ...common,
        onError: 'continue',
        threads: 1,
        rampUp: 1,
        loops: 1,
        sameUser: true,
        delayedStart: false,
        scheduler: false,
        duration: 0,
        startupDelay: 0,
      }
    case 'HTTPRequest':
      return {
        ...common,
        protocol: 'https',
        server: '',
        port: '',
        method: 'GET',
        path: '/',
        contentEncoding: '',
        followRedirects: true,
        autoRedirects: false,
        keepAlive: true,
        multipart: false,
        browserCompatible: false,
        parameters: [],
        body: '',
        files: [],
      }
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
        sharingMode: 'all',
        identifier: '',
      }
    case 'TransactionController':
      return { ...common, generateParent: false, includeTimers: false }
    case 'IfController':
      return { ...common, condition: '', interpretExpression: true, evaluateAll: false }
    case 'LoopController':
      return { ...common, loops: 1, forever: false }
    case 'ConstantTimer':
      return { ...common, delay: 300 }
    case 'JSONExtractor':
      return { ...common, variableNames: '', jsonPaths: '', matchNumbers: '1', computeConcat: false, defaults: '' }
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
    case 'JSR223Sampler':
    case 'JSR223PreProcessor':
    case 'JSR223PostProcessor':
    case 'JSR223Assertion':
      return { ...common, language: 'groovy', parameters: '', scriptFile: '', cache: true, script: '' }
    default:
      return common
  }
}

export function createNode(
  type: JMeterComponentType,
  name = names[type],
  properties: Record<string, unknown> = {},
  children: TestPlanNode[] = [],
): TestPlanNode {
  return {
    id: createId(),
    type,
    name,
    enabled: true,
    properties: { ...defaultProperties(type), ...properties },
    children,
  }
}

export function createNewTestPlan(): TestPlanNode {
  return createNode('TestPlan', 'Test Plan', {}, [createNode('ThreadGroup')])
}

export function createSampleTestPlan(): TestPlanNode {
  const loginRequest = createNode('HTTPRequest', 'HTTP Request - Login API', {
    protocol: '',
    server: '',
    method: 'POST',
    path: '/login',
    body: '{\n  "username": "${username}",\n  "password": "${password}"\n}',
  })
  const extractor = createNode('JSONExtractor', 'JSON Extractor - Extract Token', {
    variableNames: 'token',
    jsonPaths: '$.access_token',
    matchNumbers: '1',
  })
  const assertion = createNode('ResponseAssertion', 'Response Assertion - Status 200')
  loginRequest.children = [extractor, assertion]

  const transaction = createNode(
    'TransactionController',
    'Transaction Controller - Login',
    {},
    [loginRequest],
  )
  const threadGroup = createNode(
    'ThreadGroup',
    'Thread Group - Login Load Test',
    { threads: 100, rampUp: 30, loops: 5 },
    [
      createNode('HTTPRequestDefaults', 'HTTP Request Defaults', {
        protocol: 'https',
        server: 'api.example.com',
      }),
      createNode('CSVDataSet', 'CSV Data Set Config', {
        filename: 'users.csv',
        variableNames: 'username,password',
      }),
      createNode('HTTPHeaderManager', 'HTTP Header Manager', {
        headers: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Accept', value: 'application/json' },
        ],
      }),
      transaction,
      createNode('ViewResultsTree'),
      createNode('SummaryReport'),
    ],
  )

  return createNode('TestPlan', 'API Performance Test', {}, [threadGroup])
}
