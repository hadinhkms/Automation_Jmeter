// Loop Count accepts JMeter expressions (${loopCompany}) — parse, editor input/validation, writer, workload estimate.
import assert from 'node:assert'

const { countProp, isJmeterExpression } = await import('../src/jmx/parse/domReaders.ts')
const { parseProperties } = await import('../src/jmx/parse/parseProperties.ts')
const { countInput, countError } = await import('../src/editors/editorUtils.ts')
const { parseStandardThreadGroup } = await import('../src/utils/workload/threadGroupParsers.ts')
const { createNode } = await import('../src/mock/sampleTestPlan.ts')
const { browserJmxWriter } = await import('../src/jmx/writer.ts')

/** Minimal Element stand-in: enough for prop()/namedElement() (querySelectorAll('*'), getAttribute, textContent). */
function fakeElement(tagName, props, attrs = {}) {
  const kids = Object.entries(props).map(([name, text]) => ({
    tagName: typeof text === 'boolean' ? 'boolProp' : 'stringProp',
    textContent: String(text),
    children: [],
    getAttribute: (key) => (key === 'name' ? name : null),
    querySelectorAll: () => [],
  }))
  return {
    tagName, children: kids, textContent: '',
    getAttribute: (key) => attrs[key] ?? null,
    querySelectorAll: () => kids,
  }
}

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

let passed = 0
const test = (name, fn) => { fn(); passed += 1; console.log(`  ✓ ${name}`) }

console.log('Loop Count expression support')

test('isJmeterExpression detects ${var} and ${__P()}', () => {
  assert.equal(isJmeterExpression('${loopCompany}'), true)
  assert.equal(isJmeterExpression('${__P(loops,1)}'), true)
  assert.equal(isJmeterExpression('5'), false)
  assert.equal(isJmeterExpression('${}'), false)
})

test('countProp keeps expression, parses numbers, falls back on junk', () => {
  assert.equal(countProp(fakeElement('LoopController', { 'LoopController.loops': '${loopCompany}' }), 'LoopController.loops', 1), '${loopCompany}')
  assert.equal(countProp(fakeElement('LoopController', { 'LoopController.loops': ' 17 ' }), 'LoopController.loops', 1), 17)
  assert.equal(countProp(fakeElement('LoopController', { 'LoopController.loops': 'abc' }), 'LoopController.loops', 1), 1)
  assert.equal(countProp(fakeElement('LoopController', {}), 'LoopController.loops', 1), 1)
})

test('parseProperties(LoopController) keeps ${loopCompany} (was collapsed to 1)', () => {
  const props = parseProperties(fakeElement('LoopController', { 'LoopController.loops': '${loopCompany}', 'LoopController.continue_forever': true }), 'LoopController')
  assert.equal(props.loops, '${loopCompany}')
})

test('parseProperties(ThreadGroup) keeps ${loops} and numeric threads', () => {
  const props = parseProperties(fakeElement('ThreadGroup', { 'ThreadGroup.num_threads': '2', 'LoopController.loops': '${loops}' }), 'ThreadGroup')
  assert.equal(props.loops, '${loops}')
  assert.equal(props.threads, 2)
})

test('countInput stores numbers as numbers and expressions as text', () => {
  assert.equal(countInput('5'), 5)
  assert.equal(countInput(' ${loopCompany} '), '${loopCompany}')
  assert.equal(countInput(''), '')
  assert.equal(countInput('${loop'), '${loop') // partial typing kept, flagged by countError
})

test('countError: BVA on min=1 and expression bypass', () => {
  assert.equal(countError('1'), undefined)
  assert.equal(countError('0'), 'Must be at least 1')
  assert.equal(countError('-1'), 'Must be at least 1')
  assert.equal(countError('${loopCompany}'), undefined)
  assert.equal(countError(''), 'Enter a number or ${variable}')
  assert.equal(countError('${loop'), 'Enter a number or ${variable}')
})

test('writer emits LoopController.loops = ${loopCompany}', () => {
  const loop = createNode('LoopController', 'Loop Controller', { loops: '${loopCompany}', forever: false })
  const xml = browserJmxWriter.write(loop)
  assert.match(xml, /<stringProp name="LoopController\.loops">\$\{loopCompany\}<\/stringProp>/)
})

test('workload estimate does not produce NaN for expression loops', () => {
  const tg = createNode('ThreadGroup', 'TG', { threads: 3, rampUp: 10, loops: '${loops}', duration: 0 })
  const curve = parseStandardThreadGroup(tg)
  assert.ok(curve.points.every((p) => Number.isFinite(p.time) && Number.isFinite(p.vus)))
})

console.log(`\n${passed} passed, 0 failed`)
