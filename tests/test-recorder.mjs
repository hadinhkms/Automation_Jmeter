import assert from 'node:assert'
import { browserRecorder } from '../server/browserRecorder.ts'
import { parseHarContent, safeBase64Decode } from '../src/utils/harParser.ts'
import {
  isStaticUrl,
  isAnalyticsUrl,
  filterRecordedHeaders,
  extractQueryParamsAndPath,
  convertRecordedRequestsToNodes,
  convertRecordToSampler,
} from '../src/utils/recordedRequestConverter.ts'
import { isSensitiveKey, isSensitiveHeader, maskString, getJMeterVariableName } from '../src/utils/redaction/sensitiveKeys.ts'
import { redactHeaders, redactParams } from '../src/utils/redaction/redactFields.ts'
import { redactBodyContent } from '../src/utils/redaction/redactBody.ts'
import { detectSensitiveInRequest } from '../src/utils/redaction/detectSensitive.ts'
import { browserJmxWriter } from '../src/jmx/writer.ts'
import { createNode } from '../src/mock/sampleTestPlan.ts'
import { installRecorderDomShim } from './helpers/recorderDomShim.mjs'
import { rawHeaders, sampleHar } from './helpers/recorderFixtures.mjs'
import { runGoldenJmeterCli } from './helpers/goldenJmeterCli.mjs'

// Lightweight DOM shim for Node environment testing
installRecorderDomShim()

console.log('--- 1. Testing Browser Detection ---')
const detection = browserRecorder.detectBrowsers()
console.log('Detected browsers:', JSON.stringify(detection, null, 2))
assert(Array.isArray(detection.available), 'Available browsers should be an array')
console.log(`✓ Found ${detection.available.length} browser(s)`)

console.log('\n--- 2. Testing Static & Analytics Filtering ---')
assert.strictEqual(isStaticUrl('https://example.com/logo.png'), true)
assert.strictEqual(isStaticUrl('https://example.com/app.js'), true)
assert.strictEqual(isStaticUrl('https://example.com/font.woff2'), true)
assert.strictEqual(isStaticUrl('https://example.com/api/v1/users'), false)
assert.strictEqual(isAnalyticsUrl('https://www.google-analytics.com/collect'), true)
assert.strictEqual(isAnalyticsUrl('https://api.my-app.com/orders'), false)
console.log('✓ Static & analytics URL filters PASS')

console.log('\n--- 3. Testing Redundant Header Cleaning ---')
const cleaned = filterRecordedHeaders(rawHeaders)
assert.strictEqual(cleaned.length, 3, 'Should remove Host and sec- headers')
assert.deepStrictEqual(
  cleaned.map((h) => h.name),
  ['Authorization', 'Content-Type', 'X-Custom-Header'],
)
console.log('✓ Header cleaning PASS')

console.log('\n--- 4. Testing Redaction & Parameterization Utilities ---')
assert.strictEqual(isSensitiveHeader('Authorization'), true)
assert.strictEqual(isSensitiveHeader('Cookie'), true)
assert.strictEqual(isSensitiveHeader('X-API-Key'), true)
assert.strictEqual(isSensitiveHeader('Content-Type'), false)

assert.strictEqual(isSensitiveKey('password'), true)
assert.strictEqual(isSensitiveKey('accessToken'), true)
assert.strictEqual(isSensitiveKey('client_secret'), true)
assert.strictEqual(isSensitiveKey('otp_code'), true)
assert.strictEqual(isSensitiveKey('pin'), true)
assert.strictEqual(isSensitiveKey('card_number'), true)
assert.strictEqual(isSensitiveKey('jwt_token'), true)
assert.strictEqual(isSensitiveKey('csrfToken'), true)
assert.strictEqual(isSensitiveKey('username'), false)

assert.strictEqual(maskString('Bearer eyJhbGciOi...'), 'Bearer **********')
assert.strictEqual(maskString('secretPassword123'), '**********')

// Redact headers (parameterize mode)
const { headers: redHeaders, extractedVariables: hVars } = redactHeaders(
  [
    { name: 'Authorization', value: 'Bearer my_secret_token' },
    { name: 'X-Custom', value: 'normal' },
  ],
  'parameterize',
)
assert.strictEqual(redHeaders[0].value, 'Bearer ${AUTH_TOKEN}')
assert.strictEqual(hVars.AUTH_TOKEN, 'Bearer my_secret_token')

// Redact JSON body (parameterize mode)
const jsonPayload = JSON.stringify({
  username: 'admin',
  password: 'myPassword999',
  nested: { apiKey: 'key_abc_123' },
})
const { body: redJson, extractedVariables: bVars } = redactBodyContent(jsonPayload, 'parameterize')
const parsedRed = JSON.parse(redJson)
assert.strictEqual(parsedRed.username, 'admin')
assert.strictEqual(parsedRed.password, '${PASSWORD}')
assert.strictEqual(parsedRed.nested.apiKey, '${API_KEY}')
assert.strictEqual(bVars.PASSWORD, 'myPassword999')
assert.strictEqual(bVars.API_KEY, 'key_abc_123')
console.log('✓ Redaction & Parameterization PASS')

console.log('\n--- 5. Testing HAR Parser with QueryParams, FormUrlEncoded, Cookies & Unicode ---')

const harResult = parseHarContent(JSON.stringify(sampleHar))
assert.strictEqual(harResult.success, true)
assert.strictEqual(harResult.totalEntries, 2)
assert.strictEqual(harResult.requests[0].queryParams?.length, 3)
assert.strictEqual(harResult.requests[0].responseBody?.includes('Xin chào Việt Nam'), true)
assert.strictEqual(harResult.requests[0].hasSensitiveData, true) // Authorization detected
assert.strictEqual(harResult.requests[1].postParams?.length, 2)
assert.strictEqual(harResult.requests[1].hasSensitiveData, true) // password detected
console.log('✓ HAR parser PASS')

console.log('\n--- 6. Testing JMeter Node Conversion & Structural Rules ---')
const conversion = convertRecordedRequestsToNodes(harResult.requests, {
  groupByTransaction: true,
  createHeaderManager: true,
  createCookieManager: true,
  createDefaults: true,
  cleanRedundantHeaders: true,
  parameterizeSecrets: true,
})

assert.strictEqual(conversion.nodes.length, 4, 'Should have UDV + Defaults + CookieManager + TransactionController')
assert.strictEqual(conversion.nodes[0].type, 'UserDefinedVariables', 'First node should be UDV')
assert.strictEqual(conversion.nodes[1].type, 'HTTPRequestDefaults', 'Second node should be Defaults')
assert.strictEqual(conversion.nodes[2].type, 'HTTPCookieManager', 'Third node should be CookieManager')
assert.strictEqual(conversion.nodes[3].type, 'TransactionController', 'Fourth node should be TransactionController')

const txNode = conversion.nodes[3]
assert.strictEqual(txNode.properties.generateParent, true, 'TransactionController.generateParent must be true')
assert.strictEqual(txNode.properties.includeTimers, false, 'TransactionController.includeTimers must be false')
assert.strictEqual(txNode.children.length, 2, 'Should have 2 HTTPRequest children')

// Sampler 1: GET Query Request
const getSampler = txNode.children[0]
assert.strictEqual(getSampler.type, 'HTTPRequest')
assert.strictEqual(getSampler.properties.path, '/v1/users', 'Path must be clean without duplicate query params')
assert.strictEqual(getSampler.properties.server, '', 'Server should be empty to inherit from Defaults')
assert.strictEqual(getSampler.properties.postBodyRaw, false)
assert.strictEqual((getSampler.properties.parameters || []).length, 3, 'Must have 3 query params in parameters table')

// Sampler 2: Form UrlEncoded Request
const postSampler = txNode.children[1]
assert.strictEqual(postSampler.type, 'HTTPRequest')
assert.strictEqual(postSampler.properties.path, '/v1/login')
assert.strictEqual(postSampler.properties.postBodyRaw, false, 'Form urlencoded should NOT be raw body')
assert.strictEqual((postSampler.properties.parameters || []).length, 2, 'Should have username and password arguments')
const passParam = (postSampler.properties.parameters || []).find((p) => p.name === 'password')
assert.strictEqual(passParam?.value, '${PASSWORD}', 'Password must be parameterized')

console.log('✓ Converter rules and inheritance PASS')

console.log('\n--- 7. Testing Golden JMX Snapshot Export ---')
// Construct a test plan tree with the converted nodes
const rootPlan = createNode('TestPlan', 'Recorded Test Plan')
const tg = createNode('ThreadGroup', 'Thread Group')
tg.children.push(...conversion.nodes)
rootPlan.children.push(tg)

// Export to JMX XML string using browserJmxWriter
const jmxXml = browserJmxWriter.write(rootPlan)
assert(typeof jmxXml === 'string' && jmxXml.length > 500, 'JMX XML must be generated')
assert(jmxXml.includes('<jmeterTestPlan version="1.2"'), 'Must contain JMeter root tag')
assert(jmxXml.includes('<boolProp name="TransactionController.parent">true</boolProp>'), 'Must write correct TransactionController.parent property')
assert(jmxXml.includes('<boolProp name="TransactionController.includeTimers">false</boolProp>'), 'Must write correct TransactionController.includeTimers property')
assert(jmxXml.includes('ArgumentsPanel'), 'Must export UDVs')
assert(jmxXml.includes('HttpDefaultsGui'), 'Must export Defaults')
assert(jmxXml.includes('CookiePanel'), 'Must export CookieManager')

console.log('✓ Golden JMX XML Export PASS')

console.log('\n--- 8. Testing Real Apache JMeter CLI Execution & Verification ---')
runGoldenJmeterCli(jmxXml)

console.log('\n===========================================')
console.log('ALL RECORDER & CONVERTER TESTS PASSED (100%)!')
console.log('===========================================')
