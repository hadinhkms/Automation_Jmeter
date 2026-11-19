// Sprint 11 verification: DDT CSV Wizard (FEAT-P6), OAuth 2.0 + AWS SigV4 Auth Helpers (FEAT-P7)
import assert from 'node:assert'
import { createServer } from 'node:http'
import { exec } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const { parseCsvPreview, validateCsvFile, detectDelimiter, parseCsvLine, CSV_MAX_BYTES } = await import('../src/utils/ddt/csvPreviewParser.ts')
const { toVariableName, validateVariableNames, buildCsvDataSetProperties } = await import('../src/utils/ddt/csvVariableMapping.ts')
const { signAwsV4, deriveSigningKeyHex } = await import('./helpers/awsSigV4/awsSigV4Signer.ts')
const { canonicalQuery, canonicalPath, uriEncode } = await import('./helpers/awsSigV4/awsSigV4Canonical.ts')
const { createSigV4PreProcessor, generateSigV4Script, validateSigV4Options, SIGV4_DEFAULTS } = await import('../src/utils/auth/awsSigV4Generator.ts')
const { buildTokenRequest, fetchOAuth2Token, validateOAuth2Config, OAUTH2_DEFAULTS } = await import('../src/utils/auth/oauth2TokenFetcher.ts')
const { parseTokenResponse } = await import('../src/utils/auth/oauth2TokenResponse.ts')
const { buildBearerNodes } = await import('../src/utils/auth/oauth2BearerNodes.ts')
const { handleDebugProxy } = await import('../server/routes/debugProxyRouter.ts')
const { createNode } = await import('../src/mock/sampleTestPlan.ts')
const { defaultProperties } = await import('../src/mock/defaults/defaultProperties.ts').catch(() => ({ defaultProperties: null }))

console.log('====================================================')
console.log('  SPRINT 11 VERIFICATION: DDT WIZARD & AUTH HELPERS ')
console.log('====================================================\n')

let passCount = 0
let failCount = 0
let skipCount = 0
async function test(name, fn) {
  try {
    const result = await fn()
    if (result === 'SKIP') {
      console.log(`  - [SKIP] ${name}`)
      skipCount++
      return
    }
    console.log(`  ✓ [PASS] ${name}`)
    passCount++
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message)
    failCount++
  }
}

// AWS's published SigV4 test credentials (aws-sig-v4-test-suite) — documentation values, not secrets.
const AWS_TEST = { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' }
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')

// ---------------- FEAT-P6: CSV preview ----------------
await test('TC-DDT-01: Valid CSV -> header + exactly 5 preview rows, total row count', () => {
  const csv = 'username,password,role\n' + Array.from({ length: 8 }, (_, i) => `user${i},pw${i},admin`).join('\n') + '\n\n'
  const result = parseCsvPreview(csv)
  assert.ok(result.ok, result.error)
  assert.deepStrictEqual(result.preview.headers, ['username', 'password', 'role'])
  assert.strictEqual(result.preview.rows.length, 5)
  assert.deepStrictEqual(result.preview.rows[0], ['user0', 'pw0', 'admin'])
  assert.strictEqual(result.preview.totalRows, 8)
  assert.strictEqual(result.preview.delimiter, ',')
  assert.strictEqual(result.preview.quoted, false)
})

await test('TC-DDT-02: Delimiter detection (, ; tab), BOM, CRLF and quoted cells', () => {
  assert.strictEqual(detectDelimiter('a;b;c'), ';')
  assert.strictEqual(detectDelimiter('a\tb\tc'), '\t')
  assert.strictEqual(detectDelimiter('a,b;c'), ',')
  assert.deepStrictEqual(parseCsvLine('"Doe, John","say ""hi""",x', ','), ['Doe, John', 'say "hi"', 'x'])
  const semi = parseCsvPreview('﻿email;otp\r\na@x.vn;1234\r\nb@x.vn;5678\r\n')
  assert.ok(semi.ok)
  assert.strictEqual(semi.preview.delimiter, ';')
  assert.deepStrictEqual(semi.preview.headers, ['email', 'otp'])
  assert.strictEqual(semi.preview.totalRows, 2)
  const quoted = parseCsvPreview('name,city\n"Nguyen, A","Ha Noi"\n')
  assert.ok(quoted.ok && quoted.preview.quoted)
  assert.deepStrictEqual(quoted.preview.rows[0], ['Nguyen, A', 'Ha Noi'])
  const short = parseCsvPreview('a,b,c\n1\n')
  assert.deepStrictEqual(short.preview.rows[0], ['1', '', ''], 'short rows padded to header width')
})

await test('TC-DDT-03: Empty file / no header / header only -> friendly errors', () => {
  for (const empty of ['', '   \n\n', '﻿']) {
    const r = parseCsvPreview(empty)
    assert.ok(!r.ok && /empty/i.test(r.error), `empty: ${JSON.stringify(empty)}`)
  }
  const noHeader = parseCsvPreview('john@example.com,123456\njane@example.com,654321\n')
  assert.ok(!noHeader.ok && /header row/i.test(noHeader.error), noHeader.error)
  const numeric = parseCsvPreview('1,2,3\n4,5,6\n')
  assert.ok(!numeric.ok && /looks like data/i.test(numeric.error))
  const blankCol = parseCsvPreview('user,,role\na,b,c\n')
  assert.ok(!blankCol.ok && /empty column name/i.test(blankCol.error))
  const dup = parseCsvPreview('user,User\na,b\n')
  assert.ok(!dup.ok && /duplicate/i.test(dup.error))
  const headerOnly = parseCsvPreview('username,password\n')
  assert.ok(!headerOnly.ok && /no data rows/i.test(headerOnly.error))
})

await test('TC-DDT-04: File checks — 0 bytes, 20MB BVA, extension', () => {
  assert.match(validateCsvFile({ name: 'a.csv', size: 0 }), /empty/i)
  assert.strictEqual(validateCsvFile({ name: 'a.csv', size: 1 }), null)
  assert.strictEqual(validateCsvFile({ name: 'a.CSV', size: CSV_MAX_BYTES }), null)
  assert.match(validateCsvFile({ name: 'a.csv', size: CSV_MAX_BYTES + 1 }), /20 MB/)
  assert.strictEqual(validateCsvFile({ name: 'a.tsv', size: 10 }), null)
  assert.match(validateCsvFile({ name: 'a.xlsx', size: 10 }), /\.csv/)
})

await test('TC-DDT-05: Column -> ${var} mapping and validation', () => {
  assert.strictEqual(toVariableName(' user name '), 'user_name')
  assert.strictEqual(toVariableName('2fa-code'), '_2fa_code')
  assert.strictEqual(toVariableName('Mã OTP'), 'Ma_OTP')
  assert.deepStrictEqual(validateVariableNames(['a', 'b_1', 'c.d']), {})
  const errors = validateVariableNames(['a', 'a', '', '1x', 'x y'])
  assert.match(errors[1], /Duplicate/)
  assert.strictEqual(errors[2], 'Required')
  assert.ok(errors[3] && errors[4])
  assert.strictEqual(errors[0], undefined)
})

await test('TC-DDT-06: CSVDataSet node — project-relative path, header skipped, tab delimiter escaped', () => {
  const props = buildCsvDataSetProperties({
    relativePath: 'data/users.csv', delimiter: '\t', variableNames: ['username', ' password '], quoted: true,
    recycle: false, stopThread: true, sharingMode: 'group',
  })
  const node = createNode('CSVDataSet', 'CSV Data - users.csv', props)
  assert.strictEqual(node.type, 'CSVDataSet')
  assert.strictEqual(node.properties.filename, 'data/users.csv')
  assert.strictEqual(node.properties.variableNames, 'username,password')
  assert.strictEqual(node.properties.ignoreFirstLine, true)
  assert.strictEqual(node.properties.delimiter, '\\t')
  assert.strictEqual(node.properties.quotedData, true)
  assert.strictEqual(node.properties.recycle, false)
  assert.strictEqual(node.properties.stopThread, true)
  assert.strictEqual(node.properties.sharingMode, 'shareMode.group')
  assert.strictEqual(node.properties.encoding, 'UTF-8')
  if (defaultProperties) {
    const known = Object.keys(defaultProperties('CSVDataSet'))
    for (const key of Object.keys(props)) assert.ok(known.includes(key), `unknown CSVDataSet property ${key}`)
  }
})

// ---------------- FEAT-P7: AWS SigV4 ----------------
await test('TC-SIGV4-01: AWS test vector "get-vanilla" -> published signature', async () => {
  const result = await signAwsV4({
    method: 'GET', url: 'https://example.amazonaws.com/', ...AWS_TEST,
    region: 'us-east-1', service: 'service', amzDate: '20150830T123600Z',
  })
  assert.strictEqual(result.canonicalRequest, [
    'GET', '/', '', 'host:example.amazonaws.com', 'x-amz-date:20150830T123600Z', '', 'host;x-amz-date',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  ].join('\n'))
  assert.strictEqual(result.signature, '5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31')
  assert.strictEqual(result.authorization,
    'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31')
})

await test('TC-SIGV4-02: AWS docs IAM example -> signing key and signature', async () => {
  assert.strictEqual(
    await deriveSigningKeyHex(AWS_TEST.secretAccessKey, '20150830', 'us-east-1', 'iam'),
    'c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9',
  )
  const result = await signAwsV4({
    method: 'GET', url: 'https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08', ...AWS_TEST,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
    region: 'us-east-1', service: 'iam', amzDate: '20150830T123600Z',
  })
  assert.strictEqual(result.signedHeaders, 'content-type;host;x-amz-date')
  assert.strictEqual(result.signature, '5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7')
})

await test('TC-SIGV4-03: Canonical query/path encoding rules', () => {
  assert.strictEqual(canonicalQuery('?Param2=value2&Param1=value1'), 'Param1=value1&Param2=value2')
  assert.strictEqual(canonicalQuery('b=2&a=1&a=0'), 'a=0&a=1&b=2')
  assert.strictEqual(canonicalQuery('q=a+b&x=%7e*'), 'q=a%20b&x=~%2A')
  assert.strictEqual(canonicalQuery('flag'), 'flag=')
  assert.strictEqual(uriEncode("a!'()*~"), 'a%21%27%28%29%2A~')
  assert.strictEqual(canonicalPath('/', 'execute-api'), '/')
  assert.strictEqual(canonicalPath('/a%20b/c', 's3'), '/a%20b/c')
  assert.strictEqual(canonicalPath('/a%20b/c', 'execute-api'), '/a%2520b/c', 'non-S3 encodes twice')
})

await test('TC-SIGV4-04: Wizard validation keeps real keys out of the script', () => {
  assert.deepStrictEqual(validateSigV4Options(SIGV4_DEFAULTS), {})
  const bad = validateSigV4Options({ ...SIGV4_DEFAULTS, region: 'useast', service: 'Bad Service', accessKeyVar: 'AKIAIOSFODNN7EXAMPLE', secretKeyVar: AWS_TEST.secretAccessKey, sessionTokenVar: '${X}' })
  assert.ok(bad.region && bad.service && bad.sessionTokenVar)
  assert.match(bad.accessKeyVar, /real key/)
  assert.match(bad.secretKeyVar, /real key/)
  assert.throws(() => createSigV4PreProcessor({ ...SIGV4_DEFAULTS, accessKeyVar: '' }), /accessKeyVar/)
  const node = createSigV4PreProcessor({ ...SIGV4_DEFAULTS, region: 'ap-southeast-1', service: 's3', signPayloadHeader: false })
  assert.strictEqual(node.type, 'JSR223PreProcessor')
  assert.strictEqual(node.properties.language, 'groovy')
  assert.strictEqual(node.properties.scriptLanguage, undefined)
  const script = node.properties.script
  assert.ok(!script.includes('${'), 'no ${ } — JMeter would substitute it')
  assert.match(script, /String REGION = 'ap-southeast-1'/)
  assert.match(script, /boolean SIGN_PAYLOAD_HEADER = true/, 's3 forces payload header')
  assert.match(script, /setting\('AWS_SECRET_ACCESS_KEY'\)/)
  assert.ok(!/AKIA[A-Z0-9]{12}|wJalrXUtnFEMI/.test(script), 'no key material in script')
})

// End-to-end: real JMeter runs the generated Groovy PreProcessor; the receiving server re-signs and compares.
const jmeterBin = [
  join(process.cwd(), 'apache-jmeter-5.6.3', 'bin', process.platform === 'win32' ? 'jmeter.bat' : 'jmeter'),
  join(process.cwd(), 'apache-jmeter-5.6.3', 'apache-jmeter-5.6.3', 'bin', process.platform === 'win32' ? 'jmeter.bat' : 'jmeter'),
].find((p) => existsSync(p))

const xml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function sigV4Jmx(port, script, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3"><hashTree>
<TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="SigV4 e2e" enabled="true"/><hashTree>
<ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="TG" enabled="true">
<stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
<elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" enabled="true">
<boolProp name="LoopController.continue_forever">false</boolProp><stringProp name="LoopController.loops">2</stringProp></elementProp>
<stringProp name="ThreadGroup.num_threads">1</stringProp><stringProp name="ThreadGroup.ramp_time">0</stringProp></ThreadGroup><hashTree>
<HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Signed POST" enabled="true">
<boolProp name="HTTPSampler.postBodyRaw">true</boolProp>
<elementProp name="HTTPsampler.Arguments" elementType="Arguments"><collectionProp name="Arguments.arguments">
<elementProp name="" elementType="HTTPArgument"><boolProp name="HTTPArgument.always_encode">false</boolProp>
<stringProp name="Argument.value">${xml(body)}</stringProp><stringProp name="Argument.metadata">=</stringProp></elementProp>
</collectionProp></elementProp>
<stringProp name="HTTPSampler.domain">127.0.0.1</stringProp><stringProp name="HTTPSampler.port">${port}</stringProp>
<stringProp name="HTTPSampler.protocol">http</stringProp><stringProp name="HTTPSampler.path">/v1/items?b=2&amp;a=x%20y</stringProp>
<stringProp name="HTTPSampler.method">POST</stringProp><boolProp name="HTTPSampler.use_keepalive">true</boolProp>
</HTTPSamplerProxy><hashTree>
<JSR223PreProcessor guiclass="TestBeanGUI" testclass="JSR223PreProcessor" testname="AWS SigV4 Signer" enabled="true">
<stringProp name="scriptLanguage">groovy</stringProp><stringProp name="parameters"></stringProp><stringProp name="filename"></stringProp>
<stringProp name="cacheKey">true</stringProp><stringProp name="script">${xml(script)}</stringProp></JSR223PreProcessor><hashTree/>
</hashTree></hashTree></hashTree></hashTree></jmeterTestPlan>`
}

await test('TC-SIGV4-05: JMeter run — generated Groovy sends a valid Authorization: AWS4-HMAC-SHA256 header', async () => {
  if (!jmeterBin) return 'SKIP'
  const received = []
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => { received.push({ method: req.method, url: req.url, headers: req.headers, body }); res.end('{"ok":true}') })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  const dir = mkdtempSync(join(tmpdir(), 'sigv4-e2e-'))
  const body = '{"name":"Widget","qty":2}'
  const script = generateSigV4Script({ ...SIGV4_DEFAULTS, region: 'ap-southeast-1', service: 'execute-api', sessionTokenVar: 'AWS_SESSION_TOKEN' })
  writeFileSync(join(dir, 'plan.jmx'), sigV4Jmx(port, script, body), 'utf-8')
  const env = {
    ...process.env, HEAP: '-Xms128m -Xmx512m',
    AWS_ACCESS_KEY_ID: AWS_TEST.accessKeyId, AWS_SECRET_ACCESS_KEY: AWS_TEST.secretAccessKey, AWS_SESSION_TOKEN: 'test-session-token',
  }
  try {
    await new Promise((resolve, reject) => {
      exec(`"${jmeterBin}" -n -t "${join(dir, 'plan.jmx')}" -l "${join(dir, 'r.jtl')}" -j "${join(dir, 'jmeter.log')}"`,
        { cwd: dir, env, timeout: 120000 }, (err, stdout) => (err ? reject(new Error(`${err.message}\n${stdout}`)) : resolve(stdout)))
    })
    const log = existsSync(join(dir, 'jmeter.log')) ? readFileSync(join(dir, 'jmeter.log'), 'utf-8') : ''
    assert.ok(!/AWS SigV4: define/.test(log), 'keys were found')
    assert.ok(!/Problem in JSR223 script/.test(log), `Groovy error: ${log.match(/Problem in JSR223[\s\S]{0,400}/)?.[0]}`)
    assert.strictEqual(received.length, 2, `requests received (log tail: ${log.slice(-600)})`)
    for (const req of received) {
      assert.strictEqual(req.body, body)
      assert.ok(req.headers.authorization, 'Authorization header present')
      assert.match(req.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/ap-southeast-1\/execute-api\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=[0-9a-f]{64}$/)
      assert.strictEqual(req.headers['x-amz-content-sha256'], sha256(body))
      assert.strictEqual(req.headers['x-amz-security-token'], 'test-session-token')
      const expected = await signAwsV4({
        method: req.method, url: `http://${req.headers.host}${req.url}`, body, ...AWS_TEST, sessionToken: 'test-session-token',
        headers: { 'x-amz-content-sha256': req.headers['x-amz-content-sha256'] },
        region: 'ap-southeast-1', service: 'execute-api', amzDate: req.headers['x-amz-date'],
      })
      assert.strictEqual(req.headers.authorization, expected.authorization, 'Groovy signature == reference signer')
    }
    console.log(`      JMeter sent: ${received[0].headers.authorization.slice(0, 96)}…`)
  } finally {
    server.close()
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------- FEAT-P7: OAuth 2.0 ----------------
const oauth = (over) => ({ ...OAUTH2_DEFAULTS, tokenUrl: 'https://auth.example.com/token', clientId: 'cid', clientSecret: 's3cr3t', ...over })

await test('TC-OAUTH-01: Token request — client_credentials (body/basic) and password grant', () => {
  const body = buildTokenRequest(oauth({ scope: 'read write' }))
  assert.strictEqual(body.method, 'POST')
  assert.strictEqual(body.headers.find((h) => h.name === 'Content-Type').value, 'application/x-www-form-urlencoded')
  assert.deepStrictEqual(Object.fromEntries(new URLSearchParams(body.body)), { grant_type: 'client_credentials', scope: 'read write', client_id: 'cid', client_secret: 's3cr3t' })
  const basic = buildTokenRequest(oauth({ clientAuth: 'basic' }))
  assert.strictEqual(basic.headers.find((h) => h.name === 'Authorization').value, `Basic ${Buffer.from('cid:s3cr3t').toString('base64')}`)
  assert.ok(!basic.body.includes('client_secret'))
  const pw = buildTokenRequest(oauth({ grantType: 'password', username: 'qa@x.vn', password: 'p&ss' }))
  assert.deepStrictEqual(Object.fromEntries(new URLSearchParams(pw.body)).password, 'p&ss')
  assert.strictEqual(Object.fromEntries(new URLSearchParams(pw.body)).grant_type, 'password')
  const resolved = buildTokenRequest(oauth({ clientSecret: '${SECRET}' }), (t) => t.replace('${SECRET}', 'fromEnv'))
  assert.match(resolved.body, /client_secret=fromEnv/)
})

await test('TC-OAUTH-02: Validation and default secret is a ${VAR} reference', () => {
  assert.strictEqual(OAUTH2_DEFAULTS.clientSecret, '${OAUTH_CLIENT_SECRET}')
  const errors = validateOAuth2Config({ ...OAUTH2_DEFAULTS, tokenUrl: 'ftp://x', grantType: 'password' })
  assert.ok(errors.tokenUrl && errors.clientId && errors.username && errors.password)
  assert.deepStrictEqual(validateOAuth2Config(oauth({})), {})
})

await test('TC-OAUTH-03: Token response parsing (success, OAuth error, HTTP error, missing token, network)', () => {
  const ok = parseTokenResponse(200, '{"access_token":"abc","token_type":"bearer","expires_in":3600}')
  assert.deepStrictEqual(ok, { ok: true, token: { accessToken: 'abc', tokenType: 'Bearer', expiresIn: 3600 } })
  assert.match(parseTokenResponse(400, '{"error":"invalid_client","error_description":"Bad secret"}').error, /invalid_client – Bad secret/)
  assert.match(parseTokenResponse(500, 'oops').error, /HTTP 500/)
  assert.match(parseTokenResponse(200, '{"id_token":"x"}').error, /no access_token/)
  assert.match(parseTokenResponse(0, 'ECONNREFUSED').error, /Could not reach/)
})

await test('TC-OAUTH-04: Fetch through the dev-server proxy (/api/jmeter/proxy/send-single) to a local token server', async () => {
  const server = createServer(async (req, res) => {
    if (await handleDebugProxy(req, res)) return
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      const form = Object.fromEntries(new URLSearchParams(body))
      res.setHeader('Content-Type', 'application/json')
      if (form.client_id !== 'cid' || form.client_secret !== 'env-secret') {
        res.statusCode = 401
        return res.end('{"error":"invalid_client"}')
      }
      res.end(JSON.stringify({ access_token: `tok-${form.grant_type}`, token_type: 'Bearer', expires_in: 600 }))
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  const send = async (request) => {
    const res = await fetch(`${base}/api/jmeter/proxy/send-single`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) })
    return res.json()
  }
  const env = { OAUTH_CLIENT_SECRET: 'env-secret' }
  const resolve = (t) => t.replace(/\$\{(\w+)\}/g, (m, k) => env[k] ?? m)
  try {
    const cfg = { ...OAUTH2_DEFAULTS, tokenUrl: `${base}/oauth/token`, clientId: 'cid' }
    const ok = await fetchOAuth2Token(cfg, send, resolve)
    assert.deepStrictEqual(ok, { ok: true, token: { accessToken: 'tok-client_credentials', tokenType: 'Bearer', expiresIn: 600 } })
    const denied = await fetchOAuth2Token({ ...cfg, clientSecret: 'wrong' }, send, resolve)
    assert.match(denied.error, /401: invalid_client/)
    const unresolved = await fetchOAuth2Token({ ...cfg, clientSecret: '${MISSING_SECRET}' }, send, resolve)
    assert.match(unresolved.error, /\$\{MISSING_SECRET\} is not defined/)
    let called = false
    const invalid = await fetchOAuth2Token({ ...cfg, tokenUrl: '' }, async () => { called = true }, resolve)
    assert.ok(!invalid.ok && !called, 'invalid config never hits the network')
  } finally {
    server.close()
  }
})

await test('TC-OAUTH-05: Bearer nodes — UDV variable + header reference, or literal header', () => {
  const v = buildBearerNodes(' tok123 ', 'variable', 'ACCESS_TOKEN')
  assert.strictEqual(v.headerManager.type, 'HTTPHeaderManager')
  assert.deepStrictEqual(v.headerManager.properties.headers, [{ name: 'Authorization', value: 'Bearer ${ACCESS_TOKEN}' }])
  assert.strictEqual(v.variables.type, 'UserDefinedVariables')
  assert.strictEqual(v.variables.properties.variables[0].name, 'ACCESS_TOKEN')
  assert.strictEqual(v.variables.properties.variables[0].value, 'tok123')
  const h = buildBearerNodes('tok123', 'header')
  assert.strictEqual(h.variables, null)
  assert.strictEqual(h.headerManager.properties.headers[0].value, 'Bearer tok123')
  assert.throws(() => buildBearerNodes('tok', 'variable', '1bad'), /Variable names/)
  assert.throws(() => buildBearerNodes('  ', 'header'), /No access token/)
})

console.log('\n====================================================')
console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED, ${skipCount} SKIPPED`)
console.log('====================================================')
process.exit(failCount > 0 ? 1 : 0)
