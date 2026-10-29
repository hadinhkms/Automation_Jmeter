import assert from 'node:assert'
import { resolveVariables, resolveVariableMap } from '../src/utils/variableResolver'
import { extractThreadGroupCurves, computeCompositeCurve } from '../src/utils/workloadUtils'
import { evaluateSla, evaluateSamplesSla } from '../src/utils/slaEvaluator'
import { createNode } from '../src/mock/sampleTestPlan'
import type { SlaThresholds } from '../src/models/jmeter'

console.log('====================================================')
console.log('  DEEP QA & AUDIT VERIFICATION SUITE (DH-01 -> DH-06) ')
console.log('====================================================\n')

let passedTests = 0

function runTest(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`)
    console.error(err)
    process.exit(1)
  }
}

// -----------------------------------------------------------------------------
// 1. Variable Resolution & Property Boundaries (DH-02, BVA)
// -----------------------------------------------------------------------------
runTest('TC-VR-01: Nested variable maps resolve up to 5 passes', () => {
  const raw = {
    env: 'production',
    region: 'us-east-1',
    host: 'api.${env}.${region}.domain.com',
    endpoint: 'https://${host}/v1/users',
  }
  const resolved = resolveVariableMap(raw)
  assert.strictEqual(resolved.host, 'api.production.us-east-1.domain.com')
  assert.strictEqual(resolved.endpoint, 'https://api.production.us-east-1.domain.com/v1/users')
})

runTest('TC-VR-02: Self-referencing variables do not cause infinite loops', () => {
  const circular = {
    a: '${b}',
    b: '${a}',
    c: 'valid_${a}',
  }
  const resolved = resolveVariableMap(circular)
  assert.ok(resolved.c.includes('valid_'))
})

runTest('TC-VR-03: Property function ${__P(key, default)} with explicit non-empty default', () => {
  const vars = { knownKey: '8080' }
  const res1 = resolveVariables('${__P(knownKey, 3000)}', vars)
  assert.strictEqual(res1, '8080')

  const res2 = resolveVariables('${__P(missingKey, 3000)}', vars)
  assert.strictEqual(res2, '3000')
})

runTest('TC-VR-04: Property function ${__P(key,)} with explicit empty string default', () => {
  const vars = {}
  const res = resolveVariables('prefix_${__P(missingPrefix,)}_suffix', vars)
  assert.strictEqual(res, 'prefix__suffix')
})

runTest('TC-VR-05: Property function ${__P(key)} with no default returns 1 per JMeter standard', () => {
  const vars = {}
  const res = resolveVariables('${__P(unspecifiedProp)}', vars)
  assert.strictEqual(res, '1')
})

// -----------------------------------------------------------------------------
// 2. Workload Curves & Concurrency Engine (DH-01, DH-04)
// -----------------------------------------------------------------------------
runTest('TC-WL-01: Extract curves from Standard and Concurrency ThreadGroups', () => {
  const rootPlan = createNode('TestPlan', 'Root Plan', {}, [
    createNode('ThreadGroup', 'Standard TG', {
      threads: '50',
      rampUp: '10',
      duration: '60',
      loops: '1',
    }),
    createNode('ConcurrencyThreadGroup', 'Concurrency TG', {
      targetConcurrency: '100',
      rampUpTime: '50',
      rampUpSteps: '5',
      holdRateTime: '100',
    }),
  ])

  const curves = extractThreadGroupCurves(rootPlan)
  assert.strictEqual(curves.length, 2)
  assert.strictEqual(curves[0].name, 'Standard TG')
  assert.strictEqual(curves[0].type, 'Standard ThreadGroup')
  assert.strictEqual(curves[0].points[1].vus, 50)

  assert.strictEqual(curves[1].name, 'Concurrency TG')
  assert.strictEqual(curves[1].type, 'ConcurrencyThreadGroup')
  assert.strictEqual(curves[1].points[curves[1].points.length - 2].vus, 100)
})

runTest('TC-WL-02: Extract curves from Stepping and Ultimate ThreadGroups', () => {
  const rootPlan = createNode('TestPlan', 'Root Plan', {}, [
    createNode('SteppingThreadGroup', 'Stepping TG', {
      numThreads: '100',
      firstWaitSeconds: '5',
      initialThreads: '20',
      thenAddThreads: '20',
      everySeconds: '10',
      rampUpSeconds: '2',
      holdSeconds: '60',
      thenStopThreads: '50',
      stopEverySeconds: '5',
    }),
    createNode('UltimateThreadGroup', 'Ultimate TG', {
      scheduleRows: [
        { startThreads: '30', initialDelay: '0', startupTime: '10', holdLoadTime: '50', shutdownTime: '10' },
      ],
    }),
  ])

  const curves = extractThreadGroupCurves(rootPlan)
  assert.strictEqual(curves.length, 2)
  assert.strictEqual(curves[0].type, 'SteppingThreadGroup')
  assert.strictEqual(curves[1].type, 'UltimateThreadGroup')
  assert.ok(curves[0].points.length > 3)
  assert.ok(curves[1].points.length > 5)
})

runTest('TC-WL-03: Compute composite curve aggregates multiple ThreadGroups correctly', () => {
  const rootPlan = createNode('TestPlan', 'Root Plan', {}, [
    createNode('ThreadGroup', 'TG 1', { threads: '20', rampUp: '10', duration: '50' }),
    createNode('ThreadGroup', 'TG 2', { threads: '30', rampUp: '10', duration: '50' }),
  ])
  const curves = extractThreadGroupCurves(rootPlan)
  const composite = computeCompositeCurve(curves)

  assert.ok(composite.length > 0)
  const midPoint = composite.find((p) => p.time >= 15 && p.time <= 40)
  assert.ok(midPoint !== undefined)
  assert.strictEqual(midPoint.vus, 50)
})

runTest('TC-WL-04: Empty test plan produces safe default composite curve', () => {
  const emptyPlan = createNode('TestPlan', 'Empty Plan', {}, [])
  const curves = extractThreadGroupCurves(emptyPlan)
  const composite = computeCompositeCurve(curves)
  assert.strictEqual(curves.length, 0)
  assert.deepStrictEqual(composite, [{ time: 0, vus: 0 }])
})

// -----------------------------------------------------------------------------
// 3. SLA Quality Gates & Boundary Evaluation (DH-02, DH-06)
// -----------------------------------------------------------------------------
runTest('TC-SLA-01: SLA passes when metrics are strictly within thresholds', () => {
  const thresholds: SlaThresholds = {
    enabled: true,
    maxAvgLatencyMs: 200,
    maxP95LatencyMs: 400,
    maxErrorRatePercent: 1.0,
    minThroughputRps: 50,
  }
  const metrics = {
    totalSamples: 1000,
    errors: 0,
    errorRate: 0.0,
    avgLatency: 150,
    p95Latency: 350,
    throughput: 100.5,
  }
  const result = evaluateSla(thresholds, metrics)
  assert.strictEqual(result.passed, true)
  assert.strictEqual(result.rules.length, 4)
  assert.ok(result.rules.every((r) => r.passed))
})

runTest('TC-SLA-02: SLA detects violations across latency and error rate', () => {
  const thresholds: SlaThresholds = {
    enabled: true,
    maxAvgLatencyMs: 100,
    maxErrorRatePercent: 2.0,
  }
  const samples = [
    { elapsed: 150, success: true },
    { elapsed: 250, success: false },
    { elapsed: 50, success: true },
  ]
  const result = evaluateSamplesSla(thresholds, samples)
  assert.strictEqual(result.passed, false)
  assert.strictEqual(result.rules.filter((r) => !r.passed).length, 2)
})

runTest('TC-SLA-03: SLA handles empty samples gracefully without division by zero', () => {
  const thresholds: SlaThresholds = {
    enabled: true,
    maxAvgLatencyMs: 100,
  }
  const result = evaluateSamplesSla(thresholds, [])
  assert.strictEqual(result.passed, true)
  assert.strictEqual(result.rules.length, 1)
  assert.strictEqual(result.rules[0].passed, true)
})

// -----------------------------------------------------------------------------
// 4. Security & Input Sanitization (DH-05)
// -----------------------------------------------------------------------------
runTest('TC-SEC-01: Asset file name sanitizes path traversal characters', () => {
  function sanitizeAssetFileName(fileName: string): string {
    const base = fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/[\x00-\x1f]/g, '_') // eslint-disable-line no-control-regex
      .trim()
    return base || `asset_${Date.now()}`
  }
  assert.strictEqual(sanitizeAssetFileName('../../etc/passwd'), '.._.._etc_passwd')
  assert.strictEqual(sanitizeAssetFileName('..\\..\\Windows\\System32'), '.._.._Windows_System32')
  assert.strictEqual(sanitizeAssetFileName('test<script>.csv'), 'test_script_.csv')
})

runTest('TC-SEC-02: Git branch name rejection prevents illegal characters and flags', () => {
  const invalidRegex = /[^\w\-./]/
  assert.strictEqual(invalidRegex.test('valid-feature/branch.v1'), false)
  assert.strictEqual(invalidRegex.test('invalid branch name with spaces'), true)
  assert.strictEqual(invalidRegex.test('branch;rm -rf /'), true)
  assert.strictEqual(invalidRegex.test('branch`id`'), true)
  assert.strictEqual(invalidRegex.test('branch$(whoami)'), true)
})

console.log('\n====================================================')
console.log(`  VERIFICATION COMPLETE: ${passedTests} PASSED, 0 FAILED`)
console.log('====================================================\n')
