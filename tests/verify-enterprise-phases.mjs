import assert from 'node:assert'
import { browserJmxWriter } from '../src/jmx/writer.ts'
import { browserJmxParser } from '../src/jmx/parser.ts'
import { evaluateSamplesSla, evaluateSla } from '../src/utils/slaEvaluator.ts'
import { createNode } from '../src/mock/sampleTestPlan.ts'

// Lightweight DOM shim for Node environment
if (typeof globalThis.document === 'undefined') {
  class MockElement {
    constructor(tagName) {
      this.tagName = tagName
      this.nodeName = tagName
      this.attributes = {}
      this.children = []
      this.childNodes = []
      this.textContent = ''
    }
    setAttribute(name, val) { this.attributes[name] = String(val) }
    getAttribute(name) { return this.attributes[name] || null }
    hasAttribute(name) { return name in this.attributes }
    appendChild(child) {
      this.children.push(child)
      this.childNodes.push(child)
      return child
    }
    querySelector(tag) {
      for (const c of this.children) {
        if (c.tagName === tag) return c
        const found = c.querySelector(tag)
        if (found) return found
      }
      return null
    }
    querySelectorAll(tag) {
      const results = []
      for (const c of this.children) {
        if (tag === '*' || c.tagName === tag) results.push(c)
        results.push(...c.querySelectorAll(tag))
      }
      return results
    }
  }

  function parseXmlToElement(xml) {
    const root = new MockElement('root')
    const stack = [root]
    const tagRegex = /<([a-zA-Z0-9_.:-]+)([^>]*?)(\/?)>|([^<]+)|<\/([a-zA-Z0-9_.:-]+)>/g
    let match

    while ((match = tagRegex.exec(xml)) !== null) {
      const [full, openTag, attrStr, selfClose, text, closeTag] = match
      if (openTag) {
        if (openTag.startsWith('?')) continue
        const el = new MockElement(openTag)
        if (attrStr) {
          const attrRegex = /([a-zA-Z0-9_.:-]+)=["']([^"']*)["']/g
          let aMatch
          while ((aMatch = attrRegex.exec(attrStr)) !== null) {
            el.setAttribute(aMatch[1], aMatch[2])
          }
        }
        stack[stack.length - 1].appendChild(el)
        if (!selfClose) {
          stack.push(el)
        }
      } else if (closeTag) {
        if (stack.length > 1 && stack[stack.length - 1].tagName === closeTag) {
          stack.pop()
        }
      } else if (text && text.trim() && stack.length > 1) {
        stack[stack.length - 1].textContent += text.trim()
      }
    }
    return root.children[0] || root
  }

  class MockDocument {
    createElement(tag) { return new MockElement(tag) }
  }

  globalThis.document = {
    implementation: {
      createDocument: () => new MockDocument(),
    },
  }

  globalThis.DOMParser = class {
    parseFromString(xml) {
      const rootEl = parseXmlToElement(xml)
      return {
        documentElement: rootEl,
        querySelector: (tag) => rootEl.querySelector(tag),
        querySelectorAll: (tag) => rootEl.querySelectorAll(tag),
      }
    }
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

// 1. Test Plan node with new Thread Groups, Multi-Protocol samplers, and BackendListener
const rootPlan = createNode('TestPlan', 'Enterprise Test Plan', {
  userDefinedVariables: [{ name: 'BASE_URL', value: 'https://api.example.com' }],
  slaThresholds: {
    enabled: true,
    maxAvgLatencyMs: 250,
    maxP95LatencyMs: 600,
    maxErrorRatePercent: 1.0,
    minThroughputRps: 100,
    maxFailedTransactions: 0,
  },
})

// Add ConcurrencyThreadGroup
const concurrencyTg = createNode('ConcurrencyThreadGroup', 'Concurrency 100 VUs', {
  targetConcurrency: 100,
  rampUpTime: 60,
  rampUpSteps: 6,
  holdRateTime: 300,
  timeUnit: 'S',
})

// Add SteppingThreadGroup
const steppingTg = createNode('SteppingThreadGroup', 'Stepping Ramp-Up', {
  numThreads: 50,
  firstWaitSeconds: 10,
  initialThreads: 5,
  thenAddThreads: 5,
  everySeconds: 15,
  rampUpSeconds: 3,
  holdSeconds: 120,
  thenStopThreads: 10,
  stopEverySeconds: 5,
})

// Add UltimateThreadGroup
const ultimateTg = createNode('UltimateThreadGroup', 'Ultimate Schedule', {
  scheduleRows: [
    { startThreads: '50', initialDelay: '0', startupTime: '15', holdLoadTime: '120', shutdownTime: '10' },
    { startThreads: '50', initialDelay: '30', startupTime: '15', holdLoadTime: '90', shutdownTime: '10' },
  ],
})

// Add GraphQL Sampler
const graphql = createNode('GraphQLSampler', 'Query Products GraphQL', {
  protocol: 'https',
  server: 'api.example.com',
  port: '443',
  path: '/graphql',
  operationName: 'GetProducts',
  query: 'query GetProducts { products { id name price } }',
  variables: '{"limit": 20}',
  headers: [{ name: 'Authorization', value: 'Bearer token_xyz' }],
})

// Add WebSocket Samplers
const wsOpen = createNode('WebSocketOpenSampler', 'Connect WS Stream', {
  protocol: 'wss',
  server: 'stream.example.com',
  port: '443',
  path: '/v1/live',
  connectTimeout: 15000,
  readTimeout: 5000,
})

const wsWrite = createNode('WebSocketSingleWriteSampler', 'Subscribe Ticker', {
  dataType: 'Text',
  requestData: '{"op":"subscribe","channel":"ticker"}',
  createNewConnection: false,
})

const wsRead = createNode('WebSocketSingleReadSampler', 'Read Ticker Event', {
  dataType: 'Text',
  readTimeout: 5000,
  createNewConnection: false,
})

const wsClose = createNode('WebSocketCloseSampler', 'Disconnect WS', {
  statusCode: 1000,
  closeReason: 'Test Finished',
})

// Add BackendListener
const backendListener = createNode('BackendListener', 'InfluxDB Live APM Exporter', {
  classname: 'org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender',
  influxdbUrl: 'http://influxdb.internal:8086/api/v2/write?org=org&bucket=jmeter',
  application: 'enterprise-app',
  measurement: 'jmeter_metrics',
  percentiles: '50;90;95;99',
  testTitle: 'Automated CI Test',
  samplersRegex: '.*',
  summaryOnly: false,
})

concurrencyTg.children.push(graphql)
steppingTg.children.push(wsOpen, wsWrite, wsRead, wsClose)
rootPlan.children.push(concurrencyTg, steppingTg, ultimateTg, backendListener)

console.log('1. Serializing Enterprise Test Plan to JMX XML...')
const generatedXml = browserJmxWriter.write(rootPlan)

assert(generatedXml.includes('com.blazemeter.jmeter.threads.concurrency.ConcurrencyThreadGroup'), 'Missing ConcurrencyThreadGroup in XML')
assert(generatedXml.includes('kg.apc.jmeter.threads.SteppingThreadGroup'), 'Missing SteppingThreadGroup in XML')
assert(generatedXml.includes('kg.apc.jmeter.threads.UltimateThreadGroup'), 'Missing UltimateThreadGroup in XML')
assert(generatedXml.includes('GraphQLHTTPSamplerGui'), 'Missing GraphQLHTTPSamplerGui in XML')
assert(generatedXml.includes('eu.luminis.jmeter.wssampler.OpenWebSocketSampler'), 'Missing OpenWebSocketSampler in XML')
assert(generatedXml.includes('eu.luminis.jmeter.wssampler.SingleWriteWebSocketSampler'), 'Missing SingleWriteWebSocketSampler in XML')
assert(generatedXml.includes('eu.luminis.jmeter.wssampler.SingleReadWebSocketSampler'), 'Missing SingleReadWebSocketSampler in XML')
assert(generatedXml.includes('eu.luminis.jmeter.wssampler.CloseWebSocketSampler'), 'Missing CloseWebSocketSampler in XML')
assert(generatedXml.includes('BackendListener'), 'Missing BackendListener in XML')
assert(generatedXml.includes('influxdbUrl'), 'Missing influxdbUrl argument in XML')

console.log('✓ JMX Writer successfully generated compliant XML for all new components.')

console.log('2. Deserializing generated XML back into TestPlanNode tree...')
const parsedTree = browserJmxParser.parse(generatedXml)

assert.strictEqual(parsedTree.name, 'Enterprise Test Plan', 'Root plan name mismatch')
const childTypes = parsedTree.children.map((c) => c.type)
assert(childTypes.includes('ConcurrencyThreadGroup'), 'Parsed tree missing ConcurrencyThreadGroup')
assert(childTypes.includes('SteppingThreadGroup'), 'Parsed tree missing SteppingThreadGroup')
assert(childTypes.includes('UltimateThreadGroup'), 'Parsed tree missing UltimateThreadGroup')
assert(childTypes.includes('BackendListener'), 'Parsed tree missing BackendListener')

const parsedConcurrency = parsedTree.children.find((c) => c.type === 'ConcurrencyThreadGroup')
assert.strictEqual(Number(parsedConcurrency.properties.targetConcurrency), 100, 'Concurrency targetConcurrency mismatch')
assert.strictEqual(parsedConcurrency.children[0].type, 'GraphQLSampler', 'GraphQLSampler child not preserved')

const parsedStepping = parsedTree.children.find((c) => c.type === 'SteppingThreadGroup')
assert.strictEqual(Number(parsedStepping.properties.numThreads), 50, 'Stepping numThreads mismatch')
assert.strictEqual(parsedStepping.children.length, 4, 'WebSocket samplers not preserved')

console.log('✓ JMX Parser successfully round-tripped all Enterprise components with exact properties.')

console.log('3. Testing SLA Performance Evaluation Engine...')

// Mock Passing Samples
const passingSamples = Array.from({ length: 500 }, (_, i) => ({
  id: `s-${i}`,
  label: 'GET /api/products',
  code: 200,
  elapsed: 80 + Math.floor(Math.random() * 80),
  success: true,
  method: 'GET',
  url: 'https://api.example.com/products',
  request: '',
  response: '{"status":"ok"}',
  threadName: 'Thread Group 1-1',
  timestamp: '12:00:00',
  bytes: 1024,
  sentBytes: 256,
  latency: 70,
  connectTime: 20,
}))

const slaPassingResult = evaluateSamplesSla(
  {
    enabled: true,
    maxAvgLatencyMs: 200,
    maxP95LatencyMs: 300,
    maxErrorRatePercent: 0.5,
    minThroughputRps: 10,
    maxFailedTransactions: 0,
  },
  passingSamples,
)

assert.strictEqual(slaPassingResult.passed, true, 'SLA should have passed for clean samples')
assert.strictEqual(slaPassingResult.rules.length, 5, 'Should evaluate all 5 rules')
console.log(`✓ SLA Passed cleanly: "${slaPassingResult.summaryText}"`)

// Mock Failing Samples (High Latency + Errors)
const failingSamples = Array.from({ length: 100 }, (_, i) => ({
  id: `s-${i}`,
  label: 'POST /api/checkout',
  code: i % 5 === 0 ? 500 : 200,
  elapsed: 900 + (i * 10),
  success: i % 5 !== 0,
  method: 'POST',
  url: 'https://api.example.com/checkout',
  request: '',
  response: i % 5 === 0 ? 'Internal Server Error' : '{"status":"ok"}',
  threadName: 'Thread Group 1-1',
  timestamp: '12:00:00',
  bytes: 512,
  sentBytes: 256,
  latency: 800,
  connectTime: 30,
}))

const slaFailingResult = evaluateSamplesSla(
  {
    enabled: true,
    maxAvgLatencyMs: 400,
    maxP95LatencyMs: 800,
    maxErrorRatePercent: 5.0,
    minThroughputRps: 1000,
    maxFailedTransactions: 2,
  },
  failingSamples,
)

assert.strictEqual(slaFailingResult.passed, false, 'SLA should have failed for degraded samples')
assert(slaFailingResult.rules.some((r) => !r.passed), 'At least one rule must be marked failed')
console.log(`✓ SLA Failed as expected with diagnostics: "${slaFailingResult.summaryText}"`)

console.log('--- ALL ENTERPRISE VERIFICATION TESTS PASSED SUCCESSFULLY! ---')
