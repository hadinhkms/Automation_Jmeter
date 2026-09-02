import assert from 'node:assert/strict'
import { detectCorrelations, applyCorrelationsToTree } from '../src/utils/correlationDetector.ts'

console.log('--- Testing Auto-Correlation Engine ---')

const mockRequests = [
  {
    id: 'req_1',
    requestId: 'cdp_1',
    timestamp: 1000,
    protocol: 'https',
    server: 'api.example.com',
    port: '443',
    path: '/v1/auth/login',
    resourceType: 'fetch',
    method: 'POST',
    url: 'https://api.example.com/v1/auth/login',
    transaction: '01_Login',
    requestHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    postData: '{"username":"admin","password":"secretpassword"}',
    responseStatus: 200,
    responseBody: JSON.stringify({
      code: 0,
      message: 'OK',
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_jwt_payload.signature_xyz',
        sessionId: 'sess_live_998877665544',
        user: {
          id: 'usr_100200300',
          email: 'admin@example.com',
        },
      },
    }),
  },
  {
    id: 'req_2',
    requestId: 'cdp_2',
    timestamp: 2000,
    protocol: 'https',
    server: 'api.example.com',
    port: '443',
    path: '/v1/user/profile',
    resourceType: 'fetch',
    method: 'GET',
    url: 'https://api.example.com/v1/user/profile',
    transaction: '02_Get_Profile',
    requestHeaders: [
      {
        name: 'Authorization',
        value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_jwt_payload.signature_xyz',
      },
      { name: 'X-Session-ID', value: 'sess_live_998877665544' },
    ],
  },
  {
    id: 'req_3',
    requestId: 'cdp_3',
    timestamp: 3000,
    protocol: 'https',
    server: 'api.example.com',
    port: '443',
    path: '/v1/orders/create',
    resourceType: 'fetch',
    method: 'POST',
    url: 'https://api.example.com/v1/orders/create',
    transaction: '03_Create_Order',
    requestHeaders: [
      {
        name: 'Authorization',
        value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_jwt_payload.signature_xyz',
      },
    ],
    postData: JSON.stringify({
      userId: 'usr_100200300',
      item: 'MacBook Pro',
      quantity: 1,
    }),
  },
]

const candidates = detectCorrelations(mockRequests)
console.log(`Detected ${candidates.length} correlation candidates:`, candidates.map((c) => c.variableName))

assert.ok(candidates.length >= 3, 'Should discover at least 3 candidates (accessToken, sessionId, id)')

const tokenCand = candidates.find((c) => c.variableName.includes('ACCESSTOKEN') || c.variableName.includes('TOKEN'))
assert.ok(tokenCand, 'Token candidate must exist')
assert.equal(tokenCand.extractorType, 'JSONExtractor')
assert.equal(tokenCand.jsonPath, '$.data.accessToken')
assert.equal(tokenCand.targets.length, 2, 'Token should be used in req_2 and req_3')

const sessionCand = candidates.find((c) => c.variableName.includes('SESSIONID'))
assert.ok(sessionCand, 'SessionId candidate must exist')
assert.equal(sessionCand.targets.length, 1, 'SessionId should be used in req_2')

const userCand = candidates.find((c) => c.variableName.includes('ID') || c.variableName.includes('USER'))
assert.ok(userCand, 'UserId candidate must exist')
assert.equal(userCand.targets.length, 1, 'UserId should be used in req_3')

// Test applying correlations to a mock TestPlan
const mockRootNode = {
  id: 'root_tp',
  type: 'TestPlan',
  name: 'Test Plan',
  enabled: true,
  properties: {},
  children: [
    {
      id: 'tg_1',
      type: 'ThreadGroup',
      name: 'Thread Group',
      enabled: true,
      properties: {},
      children: [
        {
          id: 'req_1',
          type: 'HTTPRequest',
          name: '01_Login /v1/auth/login',
          enabled: true,
          properties: { path: '/v1/auth/login' },
          children: [],
        },
        {
          id: 'req_2',
          type: 'HTTPRequest',
          name: '02_Get_Profile /v1/user/profile',
          enabled: true,
          properties: {
            path: '/v1/user/profile',
            headers: [
              { name: 'Authorization', value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_jwt_payload.signature_xyz' },
              { name: 'X-Session-ID', value: 'sess_live_998877665544' },
            ],
          },
          children: [],
        },
        {
          id: 'req_3',
          type: 'HTTPRequest',
          name: '03_Create_Order /v1/orders/create',
          enabled: true,
          properties: {
            path: '/v1/orders/create',
            postBody: '{"userId":"usr_100200300","item":"MacBook Pro","quantity":1}',
          },
          children: [],
        },
      ],
    },
  ],
}

const correlated = applyCorrelationsToTree(mockRootNode, candidates)
const sourceReq = correlated.children[0].children[0]
assert.ok(sourceReq.children.length >= 3, 'Source Request 1 should have extracted 3 extractors attached')

const targetReq2 = correlated.children[0].children[1]
assert.equal(targetReq2.properties.headers[0].value, 'Bearer ${ACCESSTOKEN}')
assert.equal(targetReq2.properties.headers[1].value, '${SESSIONID}')

const targetReq3 = correlated.children[0].children[2]
assert.ok(targetReq3.properties.postBody.includes('${ID}'), 'Post body should contain parameterized ${ID}')

console.log('✅ Auto-Correlation Detector & Tree Injection Tests Passed 100%!')
