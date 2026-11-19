import assert from 'node:assert'
import { browserJmxWriter } from '../src/jmx/writer.ts'
import { browserJmxParser } from '../src/jmx/parser.ts'
import { evaluateSamplesSla, evaluateSla } from '../src/utils/slaEvaluator.ts'
import { installXmlDomShim } from './helpers/xmlDomShim.mjs'
import { buildEnterprisePlan } from './helpers/enterprisePlanFixture.mjs'
import { buildFailingSamples, buildPassingSamples } from './helpers/slaSampleFixtures.mjs'

// Lightweight DOM shim for Node environment
installXmlDomShim()

// 1. Test Plan node with new Thread Groups, Multi-Protocol samplers, and BackendListener
const rootPlan = buildEnterprisePlan()

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
const passingSamples = buildPassingSamples()

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
const failingSamples = buildFailingSamples()

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
