import type { JtlSample } from '../../../services/jmeterRunnerService'
import { decodeUnicodeEscapes } from '../sampleHttpUtils'

export function generateHttpResponsePreview(sample: JtlSample): string {
  const statusMsg = sample.success ? 'OK' : 'Internal Server Error / Failed'
  const statusLine = `HTTP/1.1 ${sample.code} ${statusMsg}`
  const headers = [
    `Server: Apache-Coyote/1.1`,
    `Content-Type: application/json;charset=UTF-8`,
    `Content-Length: ${sample.bytes || (sample.response ? sample.response.length : 0)}`,
    `Date: ${new Date().toUTCString()}`,
    `X-Response-Time: ${sample.elapsed}ms`,
    `X-Connect-Time: ${sample.connectTime || 0}ms`,
    `X-Latency: ${sample.latency || 0}ms`,
  ].join('\n')

  const body = sample.response || ''

  return `${statusLine}\n${headers}\n\n${body}`
}

// Format Sampler Result text in native JMeter layout
export function buildSamplerResultText(s: JtlSample): string {
  const statusMsg = s.success ? 'OK' : 'Error / Request Failed'
  const errorCount = s.success ? 0 : 1
  const isDebug = s.label.toLowerCase().includes('debug sampler')

  if (isDebug) {
    return `Thread Name: ${s.threadName || 'Thread Group 1-1'}
Sample Start: ${s.timestamp || '2026-09-01 00:39:05 ICT'}
Load time: ${s.elapsed}
Connect Time: 0
Latency: 0
Size in bytes: ${s.bytes || 320}
Sent bytes: 0
Headers size in bytes: 0
Body size in bytes: ${s.bytes || 320}
Sample Count: 1
Error Count: ${errorCount}
Data type ("text"|"bin"|""): text
Response code: ${s.code}
Response message: ${statusMsg}

DebugSampler fields:
ContentType: text/plain
DataEncoding: UTF-8`
  }

  return `Thread Name: ${s.threadName || 'Thread Group 1-1'}
Sample Start: ${s.timestamp || '2026-09-01 00:39:05 ICT'}
Load time: ${s.elapsed}
Connect Time: ${s.connectTime || 0}
Latency: ${s.latency || 0}
Size in bytes: ${s.bytes || 0}
Sent bytes: ${s.sentBytes || 0}
Headers size in bytes: 0
Body size in bytes: ${s.bytes || 0}
Sample Count: 1
Error Count: ${errorCount}
Data type ("text"|"bin"|""): text
Response code: ${s.code}
Response message: ${statusMsg}

HTTPSampleResult fields:
ContentType: application/json; charset=utf-8
DataEncoding: utf-8
URL: ${s.url || '(no url)'}
${!s.success ? `\nAssertion error: true\nAssertion message: ${s.response || 'HTTP request failed with status ' + s.code}` : ''}`
}

// Extract response body
export function buildResponseBody(selectedSample: JtlSample): string {
  const raw = selectedSample.response || ''
  const isDebug = selectedSample.label.toLowerCase().includes('debug sampler')

  if (isDebug) {
    const debugVariables = `JMeterVariables:
JMeterThread.last_sample_ok=true
account_name=Admin RE
channel_code=vl24h
id=201238842
loginEmail=admin@example.com
phone=0987654321
salary=negotiable
tax_number=0102030405
token=mock_debug_bearer_sample_jwt_xyz123
userId=201238842
START.HMS=003905
START.MS=1788197945150
START.YMD=20260901
TESTSTART.MS=1788197945150

--------------------------------------------------
SamplerProperties:
DebugSampler.JMeterProperties=false
DebugSampler.JMeterVariables=true
DebugSampler.samplerProperties=false
DebugSampler.systemProperties=false
TestElement.name=${selectedSample.label}`

    return raw && raw.includes('JMeterVariables:') ? raw : debugVariables
  }

  return decodeUnicodeEscapes(raw)
}
