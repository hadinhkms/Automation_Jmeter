import type { JtlSample } from '../../services/jmeterRunnerService'
import type { ParsedJtlResult } from '../../models/jtl'
import { parseCsvLine } from './csvLine'
import { accumulateLabelStat, type LabelStatsMap } from './labelStats'
import { buildJtlStatsRows } from './jtlStats'

export function parseCsvJtl(lines: string[]): ParsedJtlResult {
  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  const idxTimeStamp = headers.indexOf('timeStamp')
  const idxElapsed = headers.indexOf('elapsed')
  const idxLabel = headers.indexOf('label')
  const idxResponseCode = headers.indexOf('responseCode')
  const idxResponseMessage = headers.indexOf('responseMessage')
  const idxThreadName = headers.indexOf('threadName')
  const idxSuccess = headers.indexOf('success')
  const idxFailureMessage = headers.indexOf('failureMessage')
  const idxBytes = headers.indexOf('bytes')
  const idxSentBytes = headers.indexOf('sentBytes')
  const idxLatency = headers.indexOf('Latency')
  const idxConnect = headers.indexOf('Connect')
  const idxURL = headers.indexOf('URL')

  const samples: JtlSample[] = []
  const labelStats: LabelStatsMap = {}

  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvLine(lines[i])
    if (row.length < headers.length) continue

    const label = row[idxLabel] || `Sample ${i}`
    const elapsed = Number(row[idxElapsed]) || 0
    const success = (row[idxSuccess] || '').toLowerCase() === 'true'
    const code = Number(row[idxResponseCode]) || (success ? 200 : 500)
    const bytes = Number(row[idxBytes]) || 0
    const sentBytes = Number(row[idxSentBytes]) || 0
    const latency = Number(row[idxLatency]) || 0
    const connect = Number(row[idxConnect]) || 0
    const threadName = row[idxThreadName] || ''
    const timestamp = row[idxTimeStamp] ? new Date(Number(row[idxTimeStamp])).toLocaleTimeString() : ''
    const url = (idxURL !== -1 ? row[idxURL] : '') || ''
    const respMsg = (idxResponseMessage !== -1 ? row[idxResponseMessage] : '') || ''
    const failureMsg = (idxFailureMessage !== -1 ? row[idxFailureMessage] : '') || ''

    // Detect HTTP Method accurately (GET, POST, PUT, DELETE, etc.)
    const idxMethod = headers.indexOf('method')
    let method = idxMethod !== -1 ? row[idxMethod]?.toUpperCase() : ''
    if (!method || method === 'HTTP') {
      const text = `${label} ${url}`.toUpperCase()
      if (/\b(GET)\b/.test(text)) method = 'GET'
      else if (/\b(POST|LOGIN|REGISTER|UPLOAD|CREATE|ADD|SUBMIT)\b/.test(text)) method = 'POST'
      else if (/\b(PUT|UPDATE)\b/.test(text)) method = 'PUT'
      else if (/\b(DELETE|REMOVE)\b/.test(text)) method = 'DELETE'
      else if (/\b(PATCH)\b/.test(text)) method = 'PATCH'
      else method = 'GET'
    }

    samples.push({
      id: `sample-${i}`,
      label,
      code,
      elapsed,
      success,
      method,
      url,
      request: `Method: ${method}\nURL: ${url}\nThread: ${threadName}`,
      response: `Status: ${code} ${respMsg}${failureMsg ? `\nFailure: ${failureMsg}` : ''}\nLatency: ${latency}ms\nConnect: ${connect}ms\nBytes: ${bytes}`,
      threadName,
      timestamp,
      bytes,
      sentBytes,
      latency,
      connectTime: connect,
    })

    accumulateLabelStat(labelStats, label, elapsed, success, bytes, sentBytes)
  }

  const { summaryRows, aggregateRows, errorRate } = buildJtlStatsRows(labelStats)

  return {
    samples,
    summaryRows,
    aggregateRows,
    errorRate,
    totalSamples: samples.length,
  }
}
