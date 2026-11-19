/** Mock JTL samples for the SLA evaluation checks in tests/verify-enterprise-phases.mjs. */

// Mock Passing Samples
export function buildPassingSamples() {
  return Array.from({ length: 500 }, (_, i) => ({
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
}

// Mock Failing Samples (High Latency + Errors)
export function buildFailingSamples() {
  return Array.from({ length: 100 }, (_, i) => ({
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
}
