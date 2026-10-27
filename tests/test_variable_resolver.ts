import { collectKnownVariables, resolveVariables } from '../src/utils/variableResolver'

// Mock Test Plan mirroring JS-8826
const mockPlan: any = {
  id: 'tp',
  type: 'TestPlan',
  name: 'Suite',
  properties: {
    variables: [
      { name: 'host', value: 'mr.vl24hv2.qc.sieuviet-team.com' },
      { name: 'port', value: '443' },
      { name: 'protocol', value: 'https' },
      { name: 'basePath', value: '/mr-3387-service-seeker/fe/api/v1/seeker-job-alert' },
      { name: 'branch', value: 'vl24h.north' },
      { name: 'token', value: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiMjAwNDQ2NiJ9.sig' },
      { name: 'alert_id', value: '589' }
    ]
  },
  children: [
    {
      id: 'hm',
      type: 'HTTPHeaderManager',
      name: 'Global Auth & Headers',
      enabled: true,
      children: [],
      properties: {
        headers: [
          { name: 'Authorization', value: 'Bearer ${token}' },
          { name: 'X-BRANCH', value: '${branch}' },
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Accept', value: 'application/json' }
        ]
      }
    }
  ]
}

const vars = collectKnownVariables(mockPlan, { envi: 'qc' }, {})
console.log('Collected token:', vars.token.substring(0, 30) + '...')
console.log('Collected branch:', vars.branch)

const testAuthHeader = resolveVariables('Bearer ${token}', vars)
const testBranchHeader = resolveVariables('${branch}', vars)
const testUrl = resolveVariables('${protocol}://${host}${basePath}?page=1', vars)

console.log('Auth header resolved:', testAuthHeader)
console.log('Branch header resolved:', testBranchHeader)
console.log('URL resolved:', testUrl)

if (!testAuthHeader.includes('Bearer eyJ0eXAiOiJKV1Qi') || testAuthHeader.includes('${token}')) {
  throw new Error('Token substitution failed')
}
if (testBranchHeader !== 'vl24h.north') {
  throw new Error('Branch substitution failed')
}
if (!testUrl.startsWith('https://mr.vl24hv2.qc.sieuviet-team.com')) {
  throw new Error('URL substitution failed')
}
console.log('ALL TESTS PASSED!')
