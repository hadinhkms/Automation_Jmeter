// Sprint 10 verification: Local Mock Server (FEAT-P4), Request History & Multi-Tab (FEAT-P5), Chai Transpiler v2 (FEAT-P3c)
import assert from 'node:assert'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const storeDir = mkdtempSync(join(tmpdir(), 'jmeter-mock-'))
process.env.JMETER_MOCK_ROUTES_FILE = join(storeDir, 'mock-routes.json')

const { validateMockRoute, validateMockRouteList, mockPathMatches, createEmptyMockRoute } = await import('../src/models/mockServer.ts')
const { findMockRoute } = await import('../server/mock/mockRouteStore.ts')
const { handleMockServe, handleMockRoutesApi } = await import('../server/routes/mockServerRouter.ts')
const { historyStorageService, HISTORY_LIMIT } = await import('../src/services/historyStorageService.ts')
const { historyEntryToProperties, statusTone } = await import('../src/utils/debug/historyRestore.ts')
const { buildDebugRequest } = await import('../src/utils/debug/buildDebugRequest.ts')
const { useWorkspaceTabsStore, MAX_WORKSPACE_TABS } = await import('../src/store/workspaceTabsStore.ts')
const { transpilePostmanScript } = await import('../src/utils/postman/postmanScriptTranspiler.ts')
const { createNode } = await import('../src/mock/sampleTestPlan.ts')

console.log('====================================================')
console.log('  SPRINT 10 VERIFICATION: MOCK SERVER, HISTORY, TABS ')
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

// ---------------- FEAT-P4: validation & matching ----------------
await test('TC-MOCK-01: Path must start with /mock/ and name an endpoint', () => {
  assert.ok(validateMockRoute(route({ path: '/api/x' })).path)
  assert.ok(validateMockRoute(route({ path: '/mock/' })).path)
  assert.ok(validateMockRoute(route({ path: '/mock/a b' })).path, 'spaces rejected')
  assert.ok(validateMockRoute(route({ path: '/mock/a?x=1' })).path, 'query rejected')
  assert.deepStrictEqual(validateMockRoute(route({ path: '/mock/sms/send' })), {})
})

await test('TC-MOCK-02: Delay BVA 0..10000 and status 100..599', () => {
  for (const ok of [0, 1, 9999, 10000]) assert.strictEqual(validateMockRoute(route({ path: '/mock/a', delayMs: ok })).delayMs, undefined, `delay ${ok}`)
  for (const bad of [-1, 10001, 1.5, NaN]) assert.ok(validateMockRoute(route({ path: '/mock/a', delayMs: bad })).delayMs, `delay ${bad}`)
  for (const ok of [100, 200, 599]) assert.strictEqual(validateMockRoute(route({ path: '/mock/a', status: ok })).status, undefined)
  for (const bad of [99, 600, NaN]) assert.ok(validateMockRoute(route({ path: '/mock/a', status: bad })).status)
})

await test('TC-MOCK-03: JSON body must parse when Content-Type is JSON', () => {
  assert.ok(validateMockRoute(route({ path: '/mock/a', body: '{bad' })).body)
  assert.strictEqual(validateMockRoute(route({ path: '/mock/a', body: '{bad', contentType: 'text/plain' })).body, undefined)
  assert.strictEqual(validateMockRoute(route({ path: '/mock/a', body: '' })).body, undefined)
})

await test('TC-MOCK-04: Duplicate method+path rejected (ANY overlaps every method)', () => {
  const others = [route({ id: 'x', path: '/mock/a', method: 'GET' })]
  assert.ok(validateMockRoute(route({ path: '/mock/a', method: 'GET' }), others).path)
  assert.ok(validateMockRoute(route({ path: '/mock/a', method: 'ANY' }), others).path)
  assert.strictEqual(validateMockRoute(route({ path: '/mock/a', method: 'POST' }), others).path, undefined)
  const invalid = validateMockRouteList([route({ id: 'a', path: '/mock/a' }), route({ id: 'b', path: '/mock/a' })])
  assert.strictEqual(invalid.index, 1)
})

await test('TC-MOCK-05: Path patterns (:param, trailing *, trailing slash)', () => {
  assert.ok(mockPathMatches('/mock/users/:id', '/mock/users/42'))
  assert.ok(!mockPathMatches('/mock/users/:id', '/mock/users'))
  assert.ok(!mockPathMatches('/mock/users/:id', '/mock/users/42/orders'))
  assert.ok(mockPathMatches('/mock/files/*', '/mock/files/a/b/c'))
  assert.ok(!mockPathMatches('/mock/files/*', '/mock/files'))
  assert.ok(mockPathMatches('/mock/a', '/mock/a/'))
})

await test('TC-MOCK-06: Lookup prefers exact path, skips inactive and other methods', () => {
  const routes = [
    route({ id: 'pattern', path: '/mock/users/:id' }),
    route({ id: 'exact', path: '/mock/users/me' }),
    route({ id: 'off', path: '/mock/off', active: false }),
    route({ id: 'post', path: '/mock/p', method: 'POST' }),
  ]
  assert.strictEqual(findMockRoute(routes, 'GET', '/mock/users/me').id, 'exact')
  assert.strictEqual(findMockRoute(routes, 'GET', '/mock/users/7').id, 'pattern')
  assert.strictEqual(findMockRoute(routes, 'GET', '/mock/off'), undefined)
  assert.strictEqual(findMockRoute(routes, 'GET', '/mock/p'), undefined)
  assert.strictEqual(findMockRoute(routes, 'post', '/mock/p').id, 'post')
})

// ---------------- FEAT-P4: real HTTP round trip ----------------
const server = createServer(async (req, res) => {
  if (await handleMockServe(req, res)) return
  if (await handleMockRoutesApi(req, res, req.url || '')) return
  res.statusCode = 418
  res.end()
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const postRoutes = (routes) => fetch(`${base}/api/jmeter/mock/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ routes }) })

await test('TC-MOCK-07: Save routes via API, persisted to the store file', async () => {
  const res = await postRoutes([
    route({ id: 'pay', method: 'POST', path: '/mock/payment/checkout', status: 201, delayMs: 300, body: '{"status":"paid"}' }),
    route({ id: 'sms', method: 'ANY', path: '/mock/sms/send', body: '<ok/>', contentType: 'application/xml' }),
  ])
  assert.strictEqual(res.status, 200)
  assert.strictEqual((await res.json()).routes.length, 2)
  assert.ok(existsSync(process.env.JMETER_MOCK_ROUTES_FILE))
  const list = await (await fetch(`${base}/api/jmeter/mock/routes`)).json()
  assert.deepStrictEqual(list.routes.map((r) => r.id), ['pay', 'sms'])
})

await test('TC-MOCK-08: /mock/payment/checkout returns configured JSON after configured delay', async () => {
  const started = Date.now()
  const res = await fetch(`${base}/mock/payment/checkout?order=1`, { method: 'POST', body: '{"amount":10}' })
  const elapsed = Date.now() - started
  assert.strictEqual(res.status, 201)
  assert.strictEqual(res.headers.get('content-type'), 'application/json')
  assert.strictEqual(res.headers.get('x-mock-route'), 'pay')
  assert.deepStrictEqual(await res.json(), { status: 'paid' })
  assert.ok(elapsed >= 290 && elapsed < 1500, `elapsed ${elapsed}ms should be ~300ms`)
})

await test('TC-MOCK-09: ANY method, CORS preflight, unknown path 404', async () => {
  const put = await fetch(`${base}/mock/sms/send`, { method: 'PUT' })
  assert.strictEqual(put.status, 200)
  assert.strictEqual(await put.text(), '<ok/>')
  const pre = await fetch(`${base}/mock/sms/send`, { method: 'OPTIONS' })
  assert.strictEqual(pre.status, 204)
  assert.strictEqual(pre.headers.get('access-control-allow-origin'), '*')
  const missing = await fetch(`${base}/mock/nothing`)
  assert.strictEqual(missing.status, 404)
  assert.match((await missing.json()).error, /No active mock/)
})

await test('TC-MOCK-10: Invalid save rejected with 400 and failing index; store unchanged', async () => {
  const res = await postRoutes([route({ id: 'ok', path: '/mock/ok' }), route({ id: 'bad', path: '/mock/x', delayMs: 20000 })])
  assert.strictEqual(res.status, 400)
  const data = await res.json()
  assert.strictEqual(data.index, 1)
  assert.ok(data.errors.delayMs)
  const malformed = await fetch(`${base}/api/jmeter/mock/routes`, { method: 'POST', body: '{nope' })
  assert.strictEqual(malformed.status, 400)
  const list = await (await fetch(`${base}/api/jmeter/mock/routes`)).json()
  assert.strictEqual(list.routes.length, 2, 'previous routes kept')
})

server.close()
rmSync(storeDir, { recursive: true, force: true })

// ---------------- FEAT-P5: history ----------------
const entry = (i, over = {}) => ({
  id: `e${i}`, timestamp: 1_700_000_000_000 + i, nodeId: 'n1', nodeName: 'Login', method: 'POST',
  url: 'https://api.example.com:8443/v1/login?lang=vi&x=1', headers: [{ name: 'Authorization', value: 'Bearer t' }],
  body: '{"u":"a"}', status: 200, statusText: 'OK', latencyMs: 12, sizeBytes: 34, ...over,
})

await test('TC-HIST-01: Keeps only the 50 newest entries, newest first (FIFO)', async () => {
  await historyStorageService.clear()
  for (let i = 1; i <= 55; i++) await historyStorageService.add(entry(i))
  const list = await historyStorageService.list()
  assert.strictEqual(HISTORY_LIMIT, 50)
  assert.strictEqual(list.length, 50)
  assert.strictEqual(list[0].id, 'e55')
  assert.strictEqual(list[49].id, 'e6')
})

await test('TC-HIST-02: Subscribers notified; remove and clear work', async () => {
  let calls = 0
  const off = historyStorageService.subscribe(() => calls++)
  await historyStorageService.remove('e55')
  assert.strictEqual((await historyStorageService.list())[0].id, 'e54')
  await historyStorageService.clear()
  assert.strictEqual((await historyStorageService.list()).length, 0)
  off()
  assert.strictEqual(calls, 2)
})

await test('TC-HIST-03: Restore maps URL, query, method and body onto sampler properties', () => {
  const props = historyEntryToProperties(entry(1))
  assert.strictEqual(props.protocol, 'https')
  assert.strictEqual(props.server, 'api.example.com')
  assert.strictEqual(props.domain, undefined)
  assert.strictEqual(props.port, '8443')
  assert.strictEqual(props.path, '/v1/login')
  assert.deepStrictEqual(props.parameters.map((p) => [p.name, p.value]), [['lang', 'vi'], ['x', '1']])
  assert.strictEqual(props.method, 'POST')
  assert.strictEqual(props.body, '{"u":"a"}')
  assert.strictEqual(historyEntryToProperties(entry(2, { url: 'not a url' })), null)
  assert.deepStrictEqual([statusTone(204), statusTone(302), statusTone(404), statusTone(503), statusTone(0)], ['2xx', '3xx', '4xx', '5xx', 'err'])
})

await test('TC-HIST-04: buildDebugRequest resolves env vars, query params and cascaded headers', () => {
  const root = createNode('TestPlan', 'Plan', {})
  const req = createNode('HTTPRequest', 'Get user', {
    protocol: 'https', server: '{{host}}', port: '', path: '/users/{{id}}', method: 'post',
    parameters: [{ name: 'q', value: 'a b' }], body: '{"x":1}',
  })
  root.children.push(req)
  const out = buildDebugRequest(req, root, { host: 'api.test', id: '7' })
  assert.strictEqual(out.method, 'POST')
  assert.strictEqual(out.url, 'https://api.test/users/7?q=a%20b')
  assert.ok(out.headers.some((h) => h.name === 'Content-Type' && h.value === 'application/json'))
})

// ---------------- FEAT-P5: multi-tab ----------------
await test('TC-TAB-01: Tabs dedupe, cap at 8 (oldest dropped), close and prune', () => {
  const s = useWorkspaceTabsStore.getState()
  for (let i = 1; i <= 10; i++) s.open(`n${i}`)
  s.open('n10')
  let ids = useWorkspaceTabsStore.getState().openIds
  assert.strictEqual(MAX_WORKSPACE_TABS, 8)
  assert.deepStrictEqual(ids, ['n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'])
  s.close('n5')
  s.prune(new Set(['n3', 'n4', 'n9', 'n10']))
  ids = useWorkspaceTabsStore.getState().openIds
  assert.deepStrictEqual(ids, ['n3', 'n4', 'n9', 'n10'])
  s.closeOthers('n9')
  assert.deepStrictEqual(useWorkspaceTabsStore.getState().openIds, ['n9'])
})

// ---------------- FEAT-P3c: Chai transpiler v2 ----------------
await test('TC-CHAI-01: JSON equality, existence, header and response-time rules', () => {
  const nodes = transpilePostmanScript(`
    var jsonData = pm.response.json();
    pm.test("code ok", function () {
      pm.expect(jsonData.data.items[0].name).to.eql("Alice");
      pm.expect(jsonData.total).to.equal(3);
      pm.expect(jsonData.error).to.eql(null);
      pm.expect(jsonData.meta).to.exist;
      pm.expect(jsonData).to.have.property("token");
    });
    pm.response.to.have.header("Content-Type");
    pm.expect(pm.response.responseTime).to.be.below(800);
  `, 'Users')
  const byName = Object.fromEntries(nodes.map((n) => [n.name, n]))
  assert.strictEqual(byName['$.data.items[0].name equals Alice'].properties.expectedValue, 'Alice')
  assert.strictEqual(byName['$.total equals 3'].properties.jsonPath, '$.total')
  assert.strictEqual(byName['$.error equals null'].properties.expectNull, true)
  assert.strictEqual(byName['$.meta exists'].properties.jsonValidation, false)
  assert.ok(byName['$.token exists'])
  assert.strictEqual(byName['Has header Content-Type'].properties.field, 'response-headers')
  assert.match(byName['Response time below 800 ms'].properties.script, /prev\.getTime\(\) >= 800/)
  assert.ok(!nodes.some((n) => n.name.startsWith('Postman Script Stub')), 'everything translated, no stub')
})

await test('TC-CHAI-02: Untranslatable lines produce a Groovy JSR223 stub with guide', () => {
  const nodes = transpilePostmanScript(`
    pm.response.to.have.status(200);
    const ids = pm.response.json().items.map(i => i.id);
    pm.collectionVariables.set("ids", ids.join(","));
  `, 'List')
  assert.strictEqual(nodes[0].type, 'ResponseAssertion')
  const stub = nodes.find((n) => n.type === 'JSR223Assertion')
  assert.ok(stub, 'stub generated')
  assert.strictEqual(stub.properties.language, 'groovy')
  assert.match(stub.properties.script, /2 line\(s\) could not be converted/)
  assert.match(stub.properties.script, /JsonSlurper/)
  assert.ok(!stub.properties.script.includes('have.status'), 'translated line not repeated')
})

await test('TC-CHAI-03: Script with no matching rule becomes a full stub; empty script yields nothing', () => {
  const nodes = transpilePostmanScript('if (pm.response.code > 300) { console.log("x") }', 'R')
  assert.strictEqual(nodes.length, 1)
  assert.match(nodes[0].properties.script, /no rule matched/)
  assert.strictEqual(transpilePostmanScript('   ', 'R').length, 0)
})

console.log('\n====================================================')
console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('====================================================')
process.exit(failCount > 0 ? 1 : 0)
