import { createNode } from '../../src/mock/sampleTestPlan.ts'

/** Builds the enterprise Test Plan (thread groups, GraphQL/WebSocket samplers, BackendListener). */
export function buildEnterprisePlan() {
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
  return rootPlan
}
