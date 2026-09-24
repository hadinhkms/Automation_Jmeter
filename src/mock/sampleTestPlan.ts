// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import type { JMeterComponentType, TestPlanNode } from '../models/jmeter'
import { createId } from '../utils/ids'

const names: Record<JMeterComponentType, string> = {
  TestPlan: 'Test Plan',
  UserDefinedVariables: 'User Defined Variables',
  ThreadGroup: 'Thread Group',
  ConcurrencyThreadGroup: 'Concurrency Thread Group',
  SteppingThreadGroup: 'Stepping Thread Group',
  UltimateThreadGroup: 'Ultimate Thread Group',
  HTTPRequestDefaults: 'HTTP Request Defaults',
  HTTPRequest: 'HTTP Request',
  GraphQLSampler: 'GraphQL HTTP Request',
  WebSocketOpenSampler: 'WebSocket Open Connection',
  WebSocketSingleWriteSampler: 'WebSocket Single Write Sampler',
  WebSocketSingleReadSampler: 'WebSocket Single Read Sampler',
  WebSocketCloseSampler: 'WebSocket Close Connection',
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
  DebugSampler: 'Debug Sampler',
  JSR223Sampler: 'JSR223 Sampler',
  JSR223PreProcessor: 'JSR223 PreProcessor',
  JSR223PostProcessor: 'JSR223 PostProcessor',
  JSR223Assertion: 'JSR223 Assertion',
  ModuleController: 'Module Controller',
  TestFragmentController: 'Test Fragment Controller',
  BeanShellPostProcessor: 'BeanShell PostProcessor',
  BackendListener: 'Backend Listener (InfluxDB)',
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
      return { ...common, variables: [{ name: 'baseUrl', value: 'https://api.example.com', description: '' }] }
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
    case 'ConcurrencyThreadGroup':
      return {
        ...common,
        targetConcurrency: 50,
        rampUpTime: 60,
        rampUpSteps: 5,
        holdRateTime: 300,
        timeUnit: 'S',
        iterations: '',
        logFilename: '',
      }
    case 'SteppingThreadGroup':
      return {
        ...common,
        numThreads: 100,
        firstWaitSeconds: 0,
        initialThreads: 10,
        thenAddThreads: 10,
        everySeconds: 30,
        rampUpSeconds: 5,
        holdSeconds: 300,
        thenStopThreads: 5,
        stopEverySeconds: 5,
      }
    case 'UltimateThreadGroup':
      return {
        ...common,
        scheduleRows: [
          { startThreads: '100', initialDelay: '0', startupTime: '30', holdLoadTime: '300', shutdownTime: '10' },
        ],
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
    case 'GraphQLSampler':
      return {
        ...common,
        protocol: 'https',
        server: '',
        port: '',
        path: '/graphql',
        operationName: '',
        query: 'query GetItems {\n  items {\n    id\n    name\n  }\n}',
        variables: '{\n  "limit": 10\n}',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
      }
    case 'WebSocketOpenSampler':
      return {
        ...common,
        server: '',
        port: '443',
        path: '/ws',
        protocol: 'wss',
        connectTimeout: 20000,
        readTimeout: 6000,
      }
    case 'WebSocketSingleWriteSampler':
      return {
        ...common,
        requestData: '{"action":"ping","timestamp":"${__time()}"}',
        dataType: 'Text',
        createNewConnection: false,
      }
    case 'WebSocketSingleReadSampler':
      return {
        ...common,
        readTimeout: 6000,
        dataType: 'Text',
        createNewConnection: false,
      }
    case 'WebSocketCloseSampler':
      return {
        ...common,
        statusCode: 1000,
        closeReason: 'Normal Closure',
      }
    case 'BackendListener':
      return {
        ...common,
        classname: 'org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender',
        influxdbUrl: 'http://localhost:8086/api/v2/write?org=org&bucket=jmeter',
        application: 'jmeter-load-test',
        measurement: 'jmeter',
        summaryOnly: false,
        samplersRegex: '.*',
        percentiles: '90;95;99',
        testTitle: 'JMeter Studio Performance Run',
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
