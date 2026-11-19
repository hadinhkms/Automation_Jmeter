// Sprint 11 QA fixes: SigV4 header isolation (C1), CSV shareMode (C2), CSV parser (M1/M2), variable names, OAuth2, CSV upload.
import assert from 'node:assert'
import { createServer } from 'node:http'
import { exec } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const { parseCsvPreview } = await import('../src/utils/ddt/csvPreviewParser.ts')
const { parseCsvRecords } = await import('../src/utils/ddt/csvRecordParser.ts')
const { toVariableName, validateVariableNames, buildCsvDataSetProperties } = await import('../src/utils/ddt/csvVariableMapping.ts')
const { normalizeShareMode, shareModeToJmx, shareModeFromJmx } = await import('../src/utils/ddt/csvShareMode.ts')
const { findConflictingAsset, predictAssetPath } = await import('../src/utils/ddt/csvAssetConflict.ts')
const { signAwsV4 } = await import('./helpers/awsSigV4/awsSigV4Signer.ts')
const { createSigV4PreProcessor, generateSigV4Script, SIGV4_DEFAULTS } = await import('../src/utils/auth/awsSigV4Generator.ts')
const { parseTokenResponse, authScheme } = await import('../src/utils/auth/oauth2TokenResponse.ts')
const { buildBearerNodes } = await import('../src/utils/auth/oauth2BearerNodes.ts')
const { applyAuthNodes } = await import('../src/utils/auth/applyAuthNodes.ts')
const { findNode, mapNode } = await import('../src/utils/treeUtils.ts')
const { createNode } = await import('../src/mock/sampleTestPlan.ts')
const { browserJmxWriter } = await import('../src/jmx/writer.ts')

// Minimal escaping DOM shim so browserJmxWriter output is valid XML for a real JMeter run (Groovy contains < & ').
if (typeof globalThis.document === 'undefined') {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  class ShimElement {
    constructor(tagName) { this.tagName = tagName; this.attributes = {}; this.children = []; this.textContent = '' }
    setAttribute(name, val) { this.attributes[name] = String(val) }
    getAttribute(name) { return this.attributes[name] ?? null }
    appendChild(child) { this.children.push(child); return child }
  }
  globalThis.document = { implementation: { createDocument: () => ({ createElement: (tag) => new ShimElement(tag) }) } }
  globalThis.XMLSerializer = class {
    serializeToString(el) {
      const attrs = Object.entries(el.attributes).map(([k, v]) => ` ${k}="${esc(v)}"`).join('')
      const inner = el.textContent ? esc(el.textContent) : el.children.map((c) => this.serializeToString(c)).join('')
      return inner ? `<${el.tagName}${attrs}>${inner}</${el.tagName}>` : `<${el.tagName}${attrs}/>`
    }
  }
}

console.log('====================================================')
console.log('  SPRINT 11 QA FIX VERIFICATION')
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

// ---------------- Real JMeter harness (127.0.0.1 capture server only) ----------------
const jmeterBin = [
  join(process.cwd(), 'apache-jmeter-5.6.3', 'bin', process.platform === 'win32' ? 'jmeter.bat' : 'jmeter'),
  join(process.cwd(), 'apache-jmeter-5.6.3', 'apache-jmeter-5.6.3', 'bin', process.platform === 'win32' ? 'jmeter.bat' : 'jmeter'),
].find((p) => existsSync(p))

async function runJmeter(buildPlan, env = {}) {
  const received = []
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => { received.push({ method: req.method, url: req.url, headers: req.headers, rawHeaders: req.rawHeaders, body }); res.end('{"ok":true}') })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const dir = mkdtempSync(join(tmpdir(), 's11qa-'))
  try {
    writeFileSync(join(dir, 'plan.jmx'), browserJmxWriter.write(buildPlan(server.address().port, dir)), 'utf-8')
    await new Promise((resolve, reject) => {
      exec(`"${jmeterBin}" -n -t "${join(dir, 'plan.jmx')}" -l "${join(dir, 'r.jtl')}" -j "${join(dir, 'jmeter.log')}"`,
        { cwd: dir, env: { ...process.env, HEAP: '-Xms128m -Xmx512m', ...env }, timeout: 120000 },
        (err, stdout) => (err ? reject(new Error(`${err.message}\n${stdout}`)) : resolve(stdout)))
    })
    const log = existsSync(join(dir, 'jmeter.log')) ? readFileSync(join(dir, 'jmeter.log'), 'utf-8') : ''
    return { received, log }
  } finally {
    server.close()
    rmSync(dir, { recursive: true, force: true })
  }
}

const httpRequest = (name, port, path, children = []) =>
  createNode('HTTPRequest', name, { protocol: 'http', server: '127.0.0.1', port: String(port), path, method: 'GET', followRedirects: true, keepAlive: true }, children)
const countHeader = (req, name) => req.rawHeaders.filter((h, i) => i % 2 === 0 && h.toLowerCase() === name).length

// ---------------- C1: SigV4 PreProcessor must only affect its own sample ----------------
await test('TC-QA-C1a: Groovy clones the HeaderManager per sample (never mutates the shared one)', () => {
  const script = generateSigV4Script(SIGV4_DEFAULTS)
  assert.match(script, /HeaderManager manager = shared != null \? \(HeaderManager\) shared\.clone\(\) : new HeaderManager\(\)/)
  assert.match(script, /sampler\.setProperty\(new TestElementProperty\(HTTPSamplerBase\.HEADER_MANAGER, manager\)\)/)
  assert.ok(!/shared\.(add|remove)/.test(script), 'shared manager is read-only')
  assert.ok(!script.includes('${'), 'no ${ } in Groovy')
})

await test('TC-QA-C1b: JMeter run — B keeps "Bearer static-tg" without AWS headers; A signed every loop (== reference)', async () => {
  if (!jmeterBin) return 'SKIP'
  const signer = createSigV4PreProcessor({ ...SIGV4_DEFAULTS, region: 'ap-southeast-1', service: 's3', sessionTokenVar: '' })
  const { received, log } = await runJmeter((port) => createNode('TestPlan', 'C1', {}, [
    createNode('ThreadGroup', 'TG', { threads: 1, rampUp: 0, loops: 3 }, [
      createNode('HTTPHeaderManager', 'TG headers', { headers: [{ name: 'Authorization', value: 'Bearer static-tg' }, { name: 'X-Custom', value: '1' }] }),
      httpRequest('A signed', port, '/bucket/my%20key/x?prefix=a+b&list-type=2', [signer]),
      httpRequest('B plain', port, '/nosig'),
    ]),
  ]), { AWS_ACCESS_KEY_ID: AWS_TEST.accessKeyId, AWS_SECRET_ACCESS_KEY: AWS_TEST.secretAccessKey })
  assert.ok(!/Problem in JSR223 script/.test(log), `Groovy error: ${log.match(/Problem in JSR223[\s\S]{0,400}/)?.[0]}`)
  assert.strictEqual(received.length, 6, `requests received (log tail: ${log.slice(-600)})`)
  for (const req of received.filter((r) => r.url === '/nosig')) {
    assert.strictEqual(req.headers.authorization, 'Bearer static-tg', 'B keeps the Thread Group bearer')
    assert.ok(!Object.keys(req.headers).some((h) => h.startsWith('x-amz-')), 'no x-amz-* leak to B')
    assert.strictEqual(req.headers['x-custom'], '1')
  }
  const signed = received.filter((r) => r.url !== '/nosig')
  assert.strictEqual(signed.length, 3)
  for (const req of signed) {
    assert.strictEqual(countHeader(req, 'authorization'), 1, 'exactly one Authorization (no accumulation)')
    assert.strictEqual(countHeader(req, 'x-amz-date'), 1)
    assert.strictEqual(req.headers['x-custom'], '1', 'other scoped headers kept')
    const expected = await signAwsV4({
      method: req.method, url: `http://${req.headers.host}${req.url}`, body: '', ...AWS_TEST,
      headers: { 'x-amz-content-sha256': req.headers['x-amz-content-sha256'] },
      region: 'ap-southeast-1', service: 's3', amzDate: req.headers['x-amz-date'],
    })
    assert.strictEqual(req.headers.authorization, expected.authorization, 'Groovy signature == reference signer')
  }
})

// ---------------- C2: CSV shareMode uses JMeter constants ----------------
await test('TC-QA-C2a: shareMode normalisation (wizard, legacy values, identifier, parser round-trip)', () => {
  assert.strictEqual(normalizeShareMode('thread'), 'shareMode.thread')
  assert.strictEqual(normalizeShareMode('group'), 'shareMode.group')
  assert.strictEqual(normalizeShareMode(''), 'shareMode.all')
  assert.strictEqual(normalizeShareMode('shareMode.group'), 'shareMode.group')
  assert.strictEqual(shareModeToJmx('identifier', 'pool-A'), 'pool-A')
  assert.strictEqual(shareModeToJmx('identifier', ''), 'shareMode.all')
  assert.strictEqual(shareModeToJmx('all', ''), 'shareMode.all')
  for (const jmx of ['shareMode.all', 'shareMode.group', 'shareMode.thread', 'pool-A']) {
    const editor = shareModeFromJmx(jmx)
    assert.strictEqual(shareModeToJmx(editor.sharingMode, editor.identifier), jmx, `round-trip ${jmx}`)
  }
  assert.deepStrictEqual(shareModeFromJmx('thread'), { sharingMode: 'shareMode.thread', identifier: '' }, 'legacy app files read back as thread')
  const props = buildCsvDataSetProperties({ relativePath: 'data/u.csv', delimiter: ',', variableNames: ['u'], quoted: false, recycle: true, stopThread: false, sharingMode: 'shareMode.thread' })
  assert.strictEqual(props.sharingMode, 'shareMode.thread')
  const legacy = browserJmxWriter.write(createNode('TestPlan', 'P', {}, [createNode('CSVDataSet', 'csv', { filename: 'a.csv', sharingMode: 'group' })]))
  assert.match(legacy, /<stringProp name="shareMode">shareMode\.group<\/stringProp>/, 'writer normalises legacy short value')
  const editorSrc = readFileSync('src/editors/config/CSVDataSetEditor.tsx', 'utf-8')
  assert.ok(editorSrc.includes('SHARE_MODE_THREAD') && !/value: 'thread'/.test(editorSrc), 'editor uses JMeter constants')
})

await test('TC-QA-C2b: JMeter run — 2 threads with shareMode.thread each read u1', async () => {
  if (!jmeterBin) return 'SKIP'
  const { received, log } = await runJmeter((port, dir) => {
    writeFileSync(join(dir, 'users.csv'), 'user,pass\nu1,p1\nu2,p2\nu3,p3\n', 'utf-8')
    const csv = createNode('CSVDataSet', 'CSV Data - users.csv', buildCsvDataSetProperties({
      relativePath: join(dir, 'users.csv').replace(/\\/g, '/'), delimiter: ',', variableNames: ['user', 'pass'],
      quoted: false, recycle: true, stopThread: false, sharingMode: 'shareMode.thread',
    }))
    return createNode('TestPlan', 'C2', {}, [
      createNode('ThreadGroup', 'TG', { threads: 2, rampUp: 0, loops: 1 }, [csv, httpRequest('csv', port, '/csv?u=${user}')]),
    ])
  })
  assert.strictEqual(received.length, 2, `requests received (log tail: ${log.slice(-600)})`)
  assert.deepStrictEqual(received.map((r) => r.url), ['/csv?u=u1', '/csv?u=u1'], 'each thread has its own file pointer')
})

// ---------------- M1 + M2: CSV parser ----------------
await test('TC-QA-M1: quote-aware parsing — newlines in quotes, "" escapes, CR-only, unclosed quote', () => {
  const multi = parseCsvPreview('id,note\n1,"line1\nline2"\n2,ok\n')
  assert.ok(multi.ok, multi.error)
  assert.deepStrictEqual(multi.preview.rows, [['1', 'line1\nline2'], ['2', 'ok']])
  assert.strictEqual(multi.preview.totalRows, 2)
  const esc = parseCsvPreview('a,b\n"he said ""hi""","x,y"\n')
  assert.deepStrictEqual(esc.preview.rows[0], ['he said "hi"', 'x,y'])
  const cr = parseCsvPreview('a,b\r1,2\r3,4\r')
  assert.ok(cr.ok, cr.error)
  assert.deepStrictEqual(cr.preview.headers, ['a', 'b'])
  assert.strictEqual(cr.preview.totalRows, 2)
  const open = parseCsvPreview('a,b\n1,2\n"abc,def\n')
  assert.ok(!open.ok && /line 3 is never closed/.test(open.error), open.error)
  assert.strictEqual(parseCsvRecords('x;"a;b"', ';').records[0][1], 'a;b')
  assert.strictEqual(parseCsvPreview('"a;b",c\n1,2\n').preview.delimiter, ',', 'delimiter inside quotes ignored')
})

await test('TC-QA-M2: quoted flag over whole file; totals/preview match JMeter (no trim, blank lines counted)', () => {
  const late = parseCsvPreview('a,b\n1,2\n1,2\n1,2\n1,2\n1,2\n1,2\n"x,y",z\n')
  assert.strictEqual(late.preview.quoted, true, 'quote on row 8 detected')
  assert.strictEqual(late.preview.totalRows, 7)
  const spaces = parseCsvPreview('user,pass\n u , p \n')
  assert.deepStrictEqual(spaces.preview.rows[0], [' u ', ' p '], 'cells not trimmed (JMeter keeps spaces)')
  const blanks = parseCsvPreview('a\n1\n\n2\n\n\n')
  assert.strictEqual(blanks.preview.totalRows, 3, 'inner blank line counted, trailing ones skipped')
  assert.deepStrictEqual(blanks.preview.rows, [['1'], [''], ['2']])
})

await test('TC-QA-M2b: header check accepts real names, rejects data-like first rows', () => {
  for (const csv of ['user,email/phone\nx,y\n', 'a:b,c\n1,2\n', 'name,2024\nx,1\n', 'url,id\nhttps://x,1\n']) {
    const r = parseCsvPreview(csv)
    assert.ok(r.ok, `${JSON.stringify(csv)} -> ${r.error}`)
  }
  for (const csv of ['john@example.com,123456\n', '1,2,3\n4,5,6\n', 'https://a.vn,42\nx,y\n']) {
    const r = parseCsvPreview(csv)
    assert.ok(!r.ok && /looks like data/.test(r.error), `${JSON.stringify(csv)} -> ${r.error}`)
  }
  const crData = parseCsvPreview('1,2\r3,4\r')
  assert.ok(!crData.ok && /\("1"\)/.test(crData.error), `CR-only data file names the first cell: ${crData.error}`)
})

// ---------------- Variable names ----------------
await test('TC-QA-VAR: Vietnamese/Latin transliteration and col_<n> fallback', () => {
  assert.strictEqual(toVariableName('tên'), 'ten')
  assert.strictEqual(toVariableName('Số điện thoại'), 'So_dien_thoai')
  assert.strictEqual(toVariableName('Đơn giá'), 'Don_gia')
  assert.strictEqual(toVariableName('Straße'), 'Strasse')
  assert.strictEqual(toVariableName('名前', 2), 'col_3')
  assert.strictEqual(toVariableName('名前'), '')
  const names = ['名前', 'メール'].map(toVariableName)
  assert.deepStrictEqual(names, ['col_1', 'col_2'], 'Array.map passes the index')
  assert.deepStrictEqual(validateVariableNames(names), {})
})

// ---------------- OAuth 2.0 ----------------
await test('TC-QA-OAUTH-a: proxy 502/504 network failures -> "Could not reach the token endpoint"', () => {
  assert.strictEqual(parseTokenResponse(502, 'fetch failed', 'Bad Gateway').error, 'Could not reach the token endpoint: fetch failed')
  assert.match(parseTokenResponse(504, 'This operation was aborted', 'Gateway Timeout (30s exceeded)').error, /^Could not reach the token endpoint: This operation was aborted/)
  assert.match(parseTokenResponse(502, '<html>upstream</html>', 'Bad Gateway from nginx').error, /Could not reach/)
  assert.match(parseTokenResponse(502, '{"error":"temporarily_unavailable"}', 'Bad Gateway').error, /502: temporarily_unavailable/, 'JSON body = real server answer')
  assert.match(parseTokenResponse(502, 'oops', 'Proxy Error').error, /HTTP 502/, 'other statusText = upstream 502')
})

await test('TC-QA-OAUTH-c: token_type scheme (bearer -> Bearer, others kept)', () => {
  assert.strictEqual(authScheme('bearer'), 'Bearer')
  assert.strictEqual(authScheme('BEARER'), 'Bearer')
  assert.strictEqual(authScheme(undefined), 'Bearer')
  assert.strictEqual(authScheme('DPoP'), 'DPoP')
  assert.strictEqual(parseTokenResponse(200, '{"access_token":"a","token_type":"MAC"}').token.tokenType, 'MAC')
  assert.strictEqual(buildBearerNodes('tok', 'header', 'X', 'DPoP').headerManager.properties.headers[0].value, 'DPoP tok')
  assert.strictEqual(buildBearerNodes('tok', 'variable', 'AT', 'bearer').headerManager.properties.headers[0].value, 'Bearer ${AT}')
})

await test('TC-QA-OAUTH-b: repeated Apply updates "OAuth2 Bearer Header"/"OAuth2 Token" instead of duplicating', () => {
  let plan = createNode('TestPlan', 'P', {}, [createNode('ThreadGroup', 'TG', {}, [httpRequest('S', 1, '/')])])
  const samplerId = plan.children[0].children[0].id
  const target = {
    getTestPlan: () => plan,
    insertNode: (parentId, node) => { plan = mapNode(plan, parentId, (n) => ({ ...n, children: [...n.children, node] })) },
    updateNodeProperties: (id, updates) => { plan = mapNode(plan, id, (n) => ({ ...n, properties: { ...n.properties, ...updates } })) },
  }
  const apply = (token) => { const n = buildBearerNodes(token, 'variable', 'ACCESS_TOKEN'); return applyAuthNodes(target, samplerId, [n.headerManager], n.variables) }
  assert.strictEqual(apply('tok-1'), false, 'first Apply inserts')
  assert.strictEqual(apply('tok-2'), true, 'second Apply updates')
  apply('tok-3')
  const sampler = findNode(plan, samplerId)
  assert.strictEqual(sampler.children.filter((c) => c.name === 'OAuth2 Bearer Header').length, 1)
  const udvs = plan.children.filter((c) => c.name === 'OAuth2 Token')
  assert.strictEqual(udvs.length, 1)
  assert.strictEqual(udvs[0].properties.variables[0].value, 'tok-3', 'latest token stored')
})

await test('TC-QA-OAUTH-d + UI: secret/token copy, shared radio name, SigV4 Authorization warning', () => {
  const form = readFileSync('src/components/common/debug/OAuth2AuthForm.tsx', 'utf-8')
  assert.ok(!form.includes('Secrets are not saved'))
  assert.match(form, /client secret is not saved; the fetched access token is stored in the test plan/)
  assert.strictEqual((form.match(/type="radio" name=\{radioName\}/g) ?? []).length, 2, 'both radios share a name')
  const sig = readFileSync('src/components/common/debug/AwsSigV4AuthForm.tsx', 'utf-8')
  assert.match(sig, /resolveCascadedHeaders\(sampler, testPlan\)/)
  assert.match(sig, /The signer replaces it for this request only/)
})

// ---------------- CSV upload overwrite guard ----------------
await test('TC-QA-UPLOAD: existing data/<name> detected before overwrite (server naming rules)', () => {
  assert.strictEqual(predictAssetPath('C:\\fake\\users.csv'), 'data/users.csv')
  assert.strictEqual(predictAssetPath('a:b?.csv'), 'data/a_b_.csv')
  const assets = [{ fileName: 'Users.csv', relativePath: 'data/Users.csv', size: 1, updatedAt: 0 }, { fileName: 'u.csv', relativePath: 'attachments/u.csv', size: 1, updatedAt: 0 }]
  assert.strictEqual(findConflictingAsset(assets, 'users.csv')?.relativePath, 'data/Users.csv')
  assert.strictEqual(findConflictingAsset(assets, 'u.csv'), null, 'other folders do not conflict')
  const hook = readFileSync('src/components/common/ddt/useDdtWizard.ts', 'utf-8')
  assert.match(hook, /if \(seq !== loadSeq\.current\) return/, 'stale read guard')
  assert.match(hook, /confirmOverwrite\(overwritePrompt\(existing\)\)/)
})

console.log('\n====================================================')
console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED, ${skipCount} SKIPPED`)
console.log('====================================================')
process.exit(failCount > 0 ? 1 : 0)
