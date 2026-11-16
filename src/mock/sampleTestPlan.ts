import type { JMeterComponentType, TestPlanNode } from '../models/jmeter'
import { createId } from '../utils/ids'
import { componentNames as names } from './defaults/componentNames'
import { defaultProperties } from './defaults/defaultProperties'

export { defaultProperties }

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
