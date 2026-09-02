export interface MockSample {
  id: string
  label: string
  code: number
  elapsed: number
  success: boolean
  method: string
  url: string
  request: string
  response: string
  threadName?: string
  timestamp?: string
  bytes?: number
  sentBytes?: number
  latency?: number
  connectTime?: number
}


export const mockSamples: MockSample[] = [
  {
    id: 'sample-1',
    label: 'Login API',
    code: 200,
    elapsed: 184,
    success: true,
    method: 'POST',
    url: 'https://api.example.com/login',
    request: 'POST /login HTTP/1.1\nContent-Type: application/json\nAccept: application/json\n\n{\n  "username": "qa.user",\n  "password": "********"\n}',
    response: '{\n  "access_token": "eyJhbGciOi...",\n  "token_type": "Bearer",\n  "expires_in": 3600\n}',
  },
  {
    id: 'sample-2',
    label: 'Profile API',
    code: 200,
    elapsed: 92,
    success: true,
    method: 'GET',
    url: 'https://api.example.com/profile',
    request: 'GET /profile HTTP/1.1\nAuthorization: Bearer eyJhbGciOi...\nAccept: application/json',
    response: '{\n  "id": 1842,\n  "name": "QA User",\n  "role": "tester"\n}',
  },
  {
    id: 'sample-3',
    label: 'Create Order',
    code: 500,
    elapsed: 641,
    success: false,
    method: 'POST',
    url: 'https://api.example.com/orders',
    request: 'POST /orders HTTP/1.1\nContent-Type: application/json\n\n{\n  "sku": "PERF-001",\n  "quantity": 3\n}',
    response: '{\n  "error": "inventory_service_unavailable",\n  "requestId": "req-8f21a"\n}',
  },
  {
    id: 'sample-4',
    label: 'Logout',
    code: 204,
    elapsed: 76,
    success: true,
    method: 'POST',
    url: 'https://api.example.com/logout',
    request: 'POST /logout HTTP/1.1\nAuthorization: Bearer eyJhbGciOi...\n\n{}',
    response: '',
  },
  {
    id: 'sample-debug-1',
    label: 'Debug Sampler',
    code: 200,
    elapsed: 2,
    success: true,
    method: 'GET',
    url: '',
    request: 'Sampler: Debug Sampler\nThread: Thread Group 1-1',
    response: `JMeterVariables:
JMeterThread.last_sample_ok=true
account_name=Admin RE
baseUrl=https://api.example.com
channel_code=vl24h
id=201238842
loginEmail=admin@example.com
phone=0987654321
salary=negotiable
tax_number=0102030405
token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
userId=201238842
START.HMS=003905
START.MS=1788197945150
START.YMD=20260901
TESTSTART.MS=1788197945150

--------------------------------------------------
SamplerProperties:
DebugSampler.JMeterProperties=false
DebugSampler.JMeterVariables=true
DebugSampler.samplerProperties=false
DebugSampler.systemProperties=false
TestElement.name=Debug Sampler`,
    threadName: 'Thread Group 1-1',
    timestamp: '2026-09-01 00:39:05 ICT',
    bytes: 420,
    sentBytes: 0,
    latency: 0,
    connectTime: 0,
  },
]

export const summaryRows = [
  ['Login API', '500', '188', '71', '612', '42.6', '0.20%', '83.4', '24.8', '8.1', '4,812'],
  ['Profile API', '500', '96', '44', '401', '24.1', '0.00%', '83.2', '39.3', '5.6', '6,244'],
  ['Create Order', '500', '344', '131', '1,204', '118.9', '2.40%', '82.9', '18.7', '10.4', '2,941'],
  ['Logout', '500', '73', '31', '328', '18.2', '0.00%', '82.7', '4.3', '4.9', '724'],
  ['TOTAL', '2,000', '175', '31', '1,204', '91.5', '0.65%', '330.2', '87.1', '29.0', '3,680'],
]

export const aggregateRows = [
  ['Login API', '500', '188', '174', '241', '288', '492', '71', '612', '0.20%', '83.4', '24.8', '8.1'],
  ['Profile API', '500', '96', '89', '121', '142', '221', '44', '401', '0.00%', '83.2', '39.3', '5.6'],
  ['Create Order', '500', '344', '311', '498', '602', '984', '131', '1,204', '2.40%', '82.9', '18.7', '10.4'],
  ['Logout', '500', '73', '68', '91', '104', '173', '31', '328', '0.00%', '82.7', '4.3', '4.9'],
  ['TOTAL', '2,000', '175', '112', '347', '488', '872', '31', '1,204', '0.65%', '330.2', '87.1', '29.0'],
]
