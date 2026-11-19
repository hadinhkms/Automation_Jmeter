// Sprint 10 QA regression: fixes for QA-confirmed bugs in Mock Server, Chai Transpiler v2, History/Restore, Tabs, Assertion writer
import assert from 'node:assert'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { installXmlDomShim } from './helpers/xmlDomShim.mjs'

globalThis.React = React // .tsx components are compiled with the classic JSX runtime under tsx
installXmlDomShim()

const storeDir = mkdtempSync(join(tmpdir(), 'jmeter-mock-qa-'))
process.env.JMETER_MOCK_ROUTES_FILE = join(storeDir, 'mock-routes.json')
// A route stored before validation existed: its Content-Type would make setHeader throw.
writeFileSync(process.env.JMETER_MOCK_ROUTES_FILE, JSON.stringify([
  { id: 'badct', method: 'GET', path: '/mock/badct', status: 200, delayMs: 0, contentType: 'text/plain\r\nX-Evil: 1', body: 'x', active: true },
]))

const { validateMockRoute, validateMockRouteList, mockPathMatches, createEmptyMockRoute, MOCK_MIN_STATUS } = await import('../src/models/mockServer.ts')
const { handleMockServe, handleMockRoutesApi } = await import('../server/routes/mockServerRouter.ts')
const { MockRouteForm } = await import('../src/components/common/mock/MockRouteForm.tsx')
const { transpilePostmanScript } = await import('../src/utils/postman/postmanScriptTranspiler.ts')
const { historyEntryToProperties, maskHistoryHeaders, samplerSource } = await import('../src/utils/debug/historyRestore.ts')
const { buildDebugRequest } = await import('../src/utils/debug/buildDebugRequest.ts')
const { useWorkspaceTabsStore } = await import('../src/store/workspaceTabsStore.ts')
const { closeOtherTabs } = await import('../src/components/workspace/workspaceTabActions.ts')
const { createNode } = await import('../src/mock/sampleTestPlan.ts')
const { browserJmxWriter } = await import('../src/jmx/writer.ts')
const { assertionScopeToEditorValue } = await import('../src/jmx/parse/editorValues.ts')

console.log('====================================================')
console.log('  SPRINT 10 QA REGRESSION: MOCK, TRANSPILER, HISTORY ')
console.log('====================================================\n')

let passCount = 0
let failCount = 0
async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ [PASS] ${name}`)
    passCount++
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message)
    failCount++
  }
}

const route = (over) => ({ ...createEmptyMockRoute(over.id ?? 'r1'), ...over })

// ---------------- Mock server: validation ----------------
await test('QA-MOCK-02: contentType must be a single media type (no CR/LF, <=100 chars)', () => {
  for (const bad of ['text/plain\r\nSet-Cookie: a=1', 'text/plain\nX: 1', '', 'json', 'a/' + 'b'.repeat(100), 'text/html; charset']) {
    assert.ok(validateMockRoute(route({ path: '/mock/a', contentType: bad, body: 'x' })).contentType, `rejects ${JSON.stringify(bad)}`)
  }
  for (const ok of ['application/json', 'text/plain; charset=utf-8', 'application/vnd.api+json', 'multipart/form-data; boundary="a b"']) {
    assert.strictEqual(validateMockRoute(route({ path: '/mock/a', contentType: ok, body: '{}' })).contentType, undefined, ok)
  }
})

await test('QA-MOCK-03: Status 1xx rejected (200..599 only)', () => {
  assert.strictEqual(MOCK_MIN_STATUS, 200)
  for (const bad of [100, 101, 199]) assert.match(validateMockRoute(route({ path: '/mock/a', status: bad })).status, /200 to 599/)
  assert.strictEqual(validateMockRoute(route({ path: '/mock/a', status: 200 })).status, undefined)
})

await test('QA-MOCK-04a: Trailing slash rejected, duplicate ids rejected, encoded slash never matches a real slash', () => {
  assert.match(validateMockRoute(route({ path: '/mock/a/' })).path, /cannot end with "\/"/)
  assert.ok(validateMockRouteList([route({ id: 'a', path: '/mock/a' }), route({ id: 'b', path: '/mock/a/' })]))
  const dupId = validateMockRouteList([route({ id: 'x', path: '/mock/a' }), route({ id: 'x', path: '/mock/b' })])
  assert.strictEqual(dupId.index, 1)
  assert.match(dupId.errors.id, /Duplicate route id/)
  assert.ok(!mockPathMatches('/mock/a/b', '/mock/a%2Fb'))
  assert.ok(mockPathMatches('/mock/a%2Fb', '/mock/a%2Fb'))
  assert.ok(mockPathMatches('/mock/café', '/mock/caf%C3%A9'), 'segments decoded after split')
  assert.ok(!mockPathMatches('/mock/a', '/mock/%E0%A4%A'), 'bad percent-encoding never matches')
})

await test('QA-MOCK-06: Edit form shows a non-preset contentType as its own selected option', () => {
  const html = renderToStaticMarkup(createElement(MockRouteForm, {
    initial: route({ path: '/mock/v', contentType: 'application/vnd.api+json' }), others: [], saving: false, onSave() {}, onCancel() {},
  }))
  assert.match(html, /<option value="application\/vnd\.api\+json" selected="">/)
  assert.match(html, /min="200"/)
})

// ---------------- Mock server: HTTP ----------------
const server = createServer(async (req, res) => {
  if (await handleMockServe(req, res)) return
  if (await handleMockRoutesApi(req, res, req.url || '')) return
  res.statusCode = 418
  res.end()
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const host = `127.0.0.1:${server.address().port}`
const base = `http://${host}`
const api = `${base}/api/jmeter/mock/routes`
const post = (routes, headers = {}) => fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ routes }) })

await test('QA-MOCK-02b: A stored route with a bad Content-Type answers 500 JSON instead of crashing', async () => {
  const warn = console.warn
  console.warn = () => {} // the server logs the failure; keep test output clean
  const res = await fetch(`${base}/mock/badct`).finally(() => { console.warn = warn })
  assert.strictEqual(res.status, 500)
  assert.match((await res.json()).error, /could not be served/)
  assert.strictEqual(res.headers.get('x-evil'), null)
})

await test('QA-MOCK-01a: Routes API needs application/json (415) and a same-origin Origin (403)', async () => {
  const ok = [route({ id: 'h', path: '/mock/h', contentType: 'text/html', body: '<script>alert(1)</script>' })]
  const plain = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ routes: ok }) })
  assert.strictEqual(plain.status, 415)
  const form = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'routes=1' })
  assert.strictEqual(form.status, 415)
  assert.strictEqual((await post(ok, { Origin: 'http://evil.example' })).status, 403)
  assert.strictEqual((await post(ok, { Origin: 'null' })).status, 403)
  assert.strictEqual((await post(ok, { Origin: base })).status, 200, 'same-origin app save works')
  assert.strictEqual((await post(ok)).status, 200, 'no Origin (curl, tests) works')
})

await test('QA-MOCK-01b: /mock/* answers carry nosniff + CSP sandbox and keep open CORS', async () => {
  for (const path of ['/mock/h', '/mock/missing']) {
    const res = await fetch(base + path)
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff', path)
    assert.strictEqual(res.headers.get('content-security-policy'), 'sandbox', path)
    assert.strictEqual(res.headers.get('access-control-allow-origin'), '*', path)
  }
})

await test('QA-MOCK-05: Wrongly typed fields rejected with index (no coercion)', async () => {
  const good = route({ id: 'g', path: '/mock/g' })
  for (const [field, val] of [['status', '200'], ['delayMs', ''], ['body', { a: 1 }], ['contentType', 5], ['active', 'yes']]) {
    const res = await post([good, { ...route({ id: 'b', path: '/mock/b' }), [field]: val }])
    assert.strictEqual(res.status, 400, field)
    const data = await res.json()
    assert.strictEqual(data.index, 1, field)
    assert.match(data.error, new RegExp(field))
  }
})

await test('QA-MOCK-04b: HEAD uses the GET route without a body; %2F does not reach /mock/a/b', async () => {
  assert.strictEqual((await post([route({ id: 'ab', path: '/mock/a/b', body: '{"x":1}' })])).status, 200)
  const head = await fetch(`${base}/mock/a/b`, { method: 'HEAD' })
  assert.strictEqual(head.status, 200)
  assert.strictEqual(head.headers.get('x-mock-route'), 'ab')
  assert.strictEqual(await head.text(), '')
  assert.strictEqual((await fetch(`${base}/mock/a%2Fb`)).status, 404)
  assert.strictEqual((await fetch(`${base}/mock/a/b/`)).status, 200, 'request trailing slash still answered')
})

server.close()

await test('QA-MOCK-05b: Corrupt store file is moved aside, not overwritten', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jmeter-mock-corrupt-'))
  process.env.JMETER_MOCK_ROUTES_FILE = join(dir, 'mock-routes.json')
  writeFileSync(process.env.JMETER_MOCK_ROUTES_FILE, '{ corrupt')
  // A child process gets a fresh module (the store caches routes in memory after the first load).
  const helper = fileURLToPath(new URL('./helpers/loadMockStore.mjs', import.meta.url))
  const child = spawnSync(process.execPath, ['--import', 'tsx', helper], { env: process.env, encoding: 'utf8' })
  const warned = child.stderr
  assert.strictEqual(child.status, 0, child.stderr)
  assert.deepStrictEqual(JSON.parse(child.stdout.trim().split('\n').pop()), [])
  const files = readdirSync(dir)
  assert.ok(files.some((f) => /^mock-routes\.json\.corrupt-\d+$/.test(f)), files.join(','))
  assert.ok(!existsSync(process.env.JMETER_MOCK_ROUTES_FILE))
  assert.match(warned, /could not be parsed/)
  rmSync(dir, { recursive: true, force: true })
})
rmSync(storeDir, { recursive: true, force: true })

// ---------------- Chai transpiler ----------------
const names = (nodes) => nodes.map((n) => n.name)
const stubOf = (nodes) => nodes.find((n) => n.name.startsWith('Postman Script Stub'))?.properties.script ?? ''

await test('QA-CHAI-07: Comments are ignored; URLs inside strings survive', () => {
  const nodes = transpilePostmanScript([
    '// pm.response.to.have.status(404)',
    '/* pm.expect(jsonData.old).to.eql("x") */',
    'pm.response.to.have.status(200) // trailing',
    'pm.expect(pm.response.text()).to.include("http://x.com/a")',
  ].join('\n'), 'R')
  assert.deepStrictEqual(names(nodes), ['Status Code is 200', 'Response contains "http://x.com/a"'])
})

await test('QA-CHAI-08: Partially translated lines go to the stub; extractor/header/status fixes', () => {
  const two = transpilePostmanScript('pm.response.to.have.status(200); pm.environment.set("sum", jsonData.a + jsonData.b);', 'R')
  assert.strictEqual(two[0].name, 'Status Code is 200')
  assert.match(stubOf(two), /pm\.environment\.set\("sum"/)
  const tokens = transpilePostmanScript('pm.environment.set("token", jsonData.token)\npm.environment.set("token", jsonData.access_token)\npm.environment.set("token", jsonData.token)', 'R')
  assert.deepStrictEqual(tokens.map((n) => n.properties.jsonPaths), ['$.token', '$.access_token'])
  const header = transpilePostmanScript('pm.response.to.have.header("Content-Type", "application/xml")', 'R')
  assert.strictEqual(header[0].properties.patterns[0].pattern, 'Content-Type: application/xml')
  const bad = transpilePostmanScript('pm.response.to.have.status(2001)', 'R')
  assert.ok(!bad.some((n) => n.properties.field === 'response-code'), 'status(2001) is not status 200')
})

await test('QA-CHAI-09: Checks under if/else/loops stay in the stub with their condition', () => {
  const cond = transpilePostmanScript('var jsonData = pm.response.json();\nif (jsonData.type === "vip") {\n  pm.expect(jsonData.discount).to.eql(10);\n}\npm.response.to.have.status(200)', 'R')
  assert.deepStrictEqual(names(cond.filter((n) => n.type !== 'JSR223Assertion')), ['Status Code is 200'])
  assert.match(stubOf(cond), /if \(jsonData\.type === "vip"\) \{\npm\.expect\(jsonData\.discount\)/)
  const loop = transpilePostmanScript('pm.response.json().items.forEach(function (i) {\n  pm.expect(jsonData.ok).to.eql(true)\n})', 'R')
  assert.ok(!loop.some((n) => n.type === 'JSONPathAssertion'))
  const elseBranch = transpilePostmanScript('pm.response.to.have.status(200)\nif (a) {\n  x = 1\n} else {\n  pm.expect(jsonData.b).to.eql(2)\n}', 'R')
  assert.match(stubOf(elseBranch), /if \(a\) \{[\s\S]*\} else \{/)
  const braceless = transpilePostmanScript('if (a) pm.response.to.have.status(201)\npm.response.to.have.status(200)', 'R')
  assert.ok(!names(braceless).includes('Status Code is 201'))
  const named = transpilePostmanScript('pm.test("if all ok", function () {\n  pm.expect(jsonData.a).to.eql(1);\n});', 'R')
  assert.deepStrictEqual(names(named), ['$.a equals 1'], '"if" inside a test name is not a condition')
})

await test('QA-CHAI-10/11: Multi-line chains are joined; numeric literals are canonical', () => {
  const nodes = transpilePostmanScript('var jsonData = pm.response.json();\npm.expect(jsonData.a)\n  .to.eql(1);\npm.expect(jsonData.price).to.eql(10.50)\npm.expect(jsonData.n).to.eql("007")', 'R')
  assert.deepStrictEqual(nodes.map((n) => n.properties.expectedValue), ['1', '10.5', '007'])
  assert.ok(!stubOf(nodes), 'no stub')
})

await test('QA-WRITER: ResponseAssertion Sample.scope uses JMeter values and round-trips', () => {
  const plan = createNode('TestPlan', 'Plan', {})
  const scopes = ['main-and-sub', 'sub', 'main', 'variable']
  scopes.forEach((applyTo) => plan.children.push(createNode('ResponseAssertion', 'Scoped assertion', { applyTo, scopeVariable: 'v', field: 'response-code', patterns: [{ pattern: '200' }] })))
  const xml = browserJmxWriter.write(plan)
  const blocks = xml.split('testclass="ResponseAssertion"').slice(1).map((b) => b.split('</ResponseAssertion>')[0])
  const written = blocks.map((b) => /<stringProp name="Sample\.scope">([^<]*)</.exec(b)?.[1] ?? '')
  assert.deepStrictEqual(written, ['all', 'children', '', 'variable'])
  assert.ok(!xml.includes('main-and-sub'))
  assert.deepStrictEqual(written.map(assertionScopeToEditorValue), scopes)
})

// ---------------- Restore / Send Request / History / Tabs ----------------
const root = createNode('TestPlan', 'Plan', {})
const sampler = (props) => {
  const n = createNode('HTTPRequest', 'S', props)
  root.children = [n]
  return n
}
const entry = (over) => ({ id: 'e', timestamp: 1, nodeId: 'n', nodeName: 'S', method: 'GET', url: 'http://h/', headers: [], status: 200, statusText: 'OK', latencyMs: 1, sizeBytes: 1, ...over })

await test('QA-HIST-12: Restore writes back raw ${VAR} fields; old entries parse the URL without encoding/lower-casing', () => {
  const node = sampler({ protocol: 'https', server: '${HOST}', port: '${PORT}', path: '/a b/${P}', method: 'POST', body: '{"u":"${U}"}', parameters: [{ name: 'k', value: '${V}' }] })
  const props = historyEntryToProperties(entry({ url: 'https://h.com:1/a%20b/p', source: samplerSource(node) }))
  assert.deepStrictEqual([props.server, props.port, props.path, props.body, props.method], ['${HOST}', '${PORT}', '/a b/${P}', '{"u":"${U}"}', 'POST'])
  assert.deepStrictEqual(props.parameters, [{ name: 'k', value: '${V}' }])
  const old = historyEntryToProperties(entry({ url: 'http://${HOST}:8080/a%20b/%C3%A9?x=1#frag' }))
  assert.deepStrictEqual([old.protocol, old.server, old.port, old.path], ['http', '${HOST}', '8080', '/a b/é'])
  assert.deepStrictEqual(old.parameters.map((p) => [p.name, p.value]), [['x', '1']])
  assert.strictEqual(historyEntryToProperties(entry({ url: '://h' })), null)
})

await test('QA-HIST-13: buildDebugRequest sends parameters the way JMeter does', () => {
  const form = buildDebugRequest(sampler({ server: 'h', path: '/login', method: 'POST', postBodyRaw: false, parameters: [{ name: 'u', value: 'a b' }] }), root, {})
  assert.deepStrictEqual([form.url, form.body], ['https://h/login', 'u=a%20b'])
  assert.ok(form.headers.some((x) => x.name === 'Content-Type' && x.value === 'application/x-www-form-urlencoded'))
  const raw = buildDebugRequest(sampler({ server: 'h', path: '/q', method: 'POST', postBodyRaw: true, body: '{"a":1}', parameters: [{ name: 'p', value: '1' }] }), root, {})
  assert.deepStrictEqual([raw.url, raw.body], ['https://h/q', '{"a":1}'])
  const del = buildDebugRequest(sampler({ server: 'h', path: '/d', method: 'DELETE', parameters: [{ name: 'id', value: '7' }] }), root, {})
  assert.deepStrictEqual([del.url, del.body], ['https://h/d?id=7', undefined])
})

await test('QA-HIST-14: Sensitive header values are masked before storing', () => {
  const masked = maskHistoryHeaders([{ name: 'Authorization', value: 'Bearer secret-token' }, { name: 'X-API-Key', value: 'k-123456' }, { name: 'Accept', value: 'application/json' }])
  assert.strictEqual(masked[0].value, 'Bearer **********')
  assert.ok(!masked[1].value.includes('k-123456'))
  assert.strictEqual(masked[2].value, 'application/json')
})

await test('QA-TAB-15: Close others keeps and selects the chosen tab', () => {
  const s = useWorkspaceTabsStore.getState()
  for (const id of ['a', 'b', 'c']) s.open(id)
  let selected = 'a'
  closeOtherTabs('b', useWorkspaceTabsStore.getState().closeOthers, (id) => { selected = id })
  assert.deepStrictEqual(useWorkspaceTabsStore.getState().openIds, ['b'])
  assert.strictEqual(selected, 'b')
})

console.log('\n====================================================')
console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('====================================================')
process.exit(failCount > 0 ? 1 : 0)
