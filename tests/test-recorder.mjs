import assert from 'node:assert'
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
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
import {
  isSensitiveKey,
  isSensitiveHeader,
  maskString,
  getJMeterVariableName,
  redactHeaders,
  redactParams,
  redactBodyContent,
  detectSensitiveInRequest,
} from '../src/utils/redactionUtils.ts'
import { browserJmxWriter } from '../src/jmx/writer.ts'
import { createNode } from '../src/mock/sampleTestPlan.ts'

// Lightweight DOM shim for Node environment testing
if (typeof globalThis.document === 'undefined') {
  class MockElement {
    constructor(tagName) {
      this.tagName = tagName
      this.attributes = {}
      this.children = []
      this.textContent = ''
    }
    setAttribute(name, val) {
      this.attributes[name] = String(val)
    }
    getAttribute(name) {
      return this.attributes[name]
    }
    appendChild(child) {
      this.children.push(child)
      return child
    }
  }
  class MockDocument {
    createElement(tag) {
      return new MockElement(tag)
    }
  }
  globalThis.document = {
    implementation: {
      createDocument: () => new MockDocument(),
    },
  }
  globalThis.XMLSerializer = class {
    serializeToString(el) {
      const attrs = Object.entries(el.attributes)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('')
      if (el.children.length === 0 && !el.textContent) {
        return `<${el.tagName}${attrs}/>`
      }
      const inner = el.textContent || el.children.map((c) => this.serializeToString(c)).join('')
      return `<${el.tagName}${attrs}>${inner}</${el.tagName}>`
    }
  }
}

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
const rawHeaders = [
  { name: 'Host', value: 'api.example.com' },
  { name: 'sec-ch-ua', value: '"Chromium";v="124"' },
  { name: 'sec-fetch-dest', value: 'empty' },
  { name: 'Authorization', value: 'Bearer eyJhbGciOi...' },
  { name: 'Content-Type', value: 'application/json' },
  { name: 'X-Custom-Header', value: 'MyValue' },
]
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
const sampleHar = {
  log: {
    version: '1.2',
    creator: { name: 'Chrome DevTools', version: '124' },
    pages: [{ id: 'page_1', title: 'Login Page' }],
    entries: [
      {
        pageref: 'page_1',
        startedDateTime: '2026-09-02T01:00:00.000Z',
        time: 120,
        request: {
          method: 'GET',
          url: 'https://api.example.com/v1/users?page=1&limit=20&search=h%C3%A0+n%E1%BB%99i',
          queryString: [
            { name: 'page', value: '1' },
            { name: 'limit', value: '20' },
            { name: 'search', value: 'hà nội' },
          ],
          headers: [{ name: 'Authorization', value: 'Bearer test_token' }],
          cookies: [{ name: 'sessionId', value: 'sess_12345', domain: 'example.com' }],
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
          content: {
            size: 150,
            mimeType: 'application/json',
            text: Buffer.from(JSON.stringify({ message: 'Xin chào Việt Nam' })).toString('base64'),
            encoding: 'base64',
          },
        },
      },
      {
        pageref: 'page_1',
        startedDateTime: '2026-09-02T01:00:01.000Z',
        time: 250,
        request: {
          method: 'POST',
          url: 'https://api.example.com/v1/login',
          headers: [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
          postData: {
            mimeType: 'application/x-www-form-urlencoded',
            params: [
              { name: 'username', value: 'user1' },
              { name: 'password', value: 'secretPass' },
            ],
          },
        },
        response: {
          status: 200,
          statusText: 'OK',
          content: { mimeType: 'application/json', text: '{"status":"success"}' },
        },
      },
    ],
  },
}

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
const fixturesDir = join(process.cwd(), 'tests', 'fixtures')
mkdirSync(fixturesDir, { recursive: true })
const jmxFilePath = join(fixturesDir, 'golden_recorded_plan.jmx')
const jtlFilePath = join(fixturesDir, 'golden_recorded_run.jtl')
const reportDirPath = join(fixturesDir, 'golden_recorded_report')

writeFileSync(jmxFilePath, jmxXml, 'utf-8')
console.log(`✓ Exported JMX file written to: ${jmxFilePath}`)

// Locate JMeter executable
const candidates = [
  join(process.cwd(), 'apache-jmeter-5.6.3', 'apache-jmeter-5.6.3', 'bin', process.platform === 'win32' ? 'jmeter.bat' : 'jmeter'),
  join(process.cwd(), 'apache-jmeter-5.6.3', 'bin', process.platform === 'win32' ? 'jmeter.bat' : 'jmeter'),
]
const jmeterExe = candidates.find((p) => existsSync(p))

if (jmeterExe) {
  console.log(`Running JMeter CLI: ${jmeterExe}`)
  try {
    if (existsSync(jtlFilePath)) rmSync(jtlFilePath, { force: true })
    if (existsSync(reportDirPath)) rmSync(reportDirPath, { recursive: true, force: true })

    const cmd = `"${jmeterExe}" -n -t "${jmxFilePath}" -l "${jtlFilePath}" -e -o "${reportDirPath}" -f`
    const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' })
    console.log(output)

    assert(existsSync(jtlFilePath), 'JTL results file must be generated')
    assert(existsSync(join(reportDirPath, 'index.html')), 'HTML Dashboard report index.html must be generated')
    console.log('✓ Apache JMeter 5.6.3 CLI Non-GUI Run & HTML Report Generation PASS 100%!')
  } catch (err) {
    console.error('JMeter CLI Execution Error:', err)
    throw err
  }
} else {
  console.log('⚠ JMeter executable not found in workspace, skipping CLI execution step.')
}

console.log('\n===========================================')
console.log('ALL RECORDER & CONVERTER TESTS PASSED (100%)!')
console.log('===========================================')
