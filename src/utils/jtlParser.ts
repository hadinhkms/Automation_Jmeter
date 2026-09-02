import type { JtlSample } from '../services/jmeterRunnerService'

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export interface ParsedJtlResult {
  samples: JtlSample[]
  summaryRows: string[][]
  aggregateRows: string[][]
  errorRate: number
  totalSamples: number
}

export function parseJtlContent(content: string): ParsedJtlResult {
  if (!content || !content.trim()) {
    return { samples: [], summaryRows: [], aggregateRows: [], errorRate: 0, totalSamples: 0 }
  }

  // Handle XML formatted JTL (<testResults>...</testResults>)
  if (content.trim().startsWith('<')) {
    return parseXmlJtl(content)
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length <= 1) {
    return { samples: [], summaryRows: [], aggregateRows: [], errorRate: 0, totalSamples: 0 }
  }

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
  const labelStats: Record<string, {
    count: number
    elapsedList: number[]
    errors: number
    bytesTotal: number
    sentBytesTotal: number
    min: number
    max: number
  }> = {}

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


    if (!labelStats[label]) {
      labelStats[label] = {
        count: 0,
        elapsedList: [],
        errors: 0,
        bytesTotal: 0,
        sentBytesTotal: 0,
        min: Infinity,
        max: -Infinity,
      }
    }
    const s = labelStats[label]
    s.count += 1
    s.elapsedList.push(elapsed)
    if (!success) s.errors += 1
    s.bytesTotal += bytes
    s.sentBytesTotal += sentBytes
    if (elapsed < s.min) s.min = elapsed
    if (elapsed > s.max) s.max = elapsed
  }

  const summaryRows: string[][] = []
  const aggregateRows: string[][] = []
  let totalCount = 0
  let totalErrors = 0
  let totalElapsedSum = 0
  let globalMin = Infinity
  let globalMax = -Infinity
  let totalBytesSum = 0

  Object.entries(labelStats).forEach(([label, s]) => {
    totalCount += s.count
    totalErrors += s.errors
    const sum = s.elapsedList.reduce((a, b) => a + b, 0)
    totalElapsedSum += sum
    totalBytesSum += s.bytesTotal
    if (s.min < globalMin) globalMin = s.min
    if (s.max > globalMax) globalMax = s.max

    const avg = s.count > 0 ? Math.round(sum / s.count) : 0
    const errPct = s.count > 0 ? ((s.errors / s.count) * 100).toFixed(2) + '%' : '0.00%'
    const throughput = s.count > 0 ? (s.count / Math.max(1, sum / 1000)).toFixed(1) + '/sec' : '0/sec'
    const kbPerSec = (s.bytesTotal / 1024 / Math.max(1, sum / 1000)).toFixed(2)
    const avgBytes = s.count > 0 ? Math.round(s.bytesTotal / s.count) : 0

    // Sorted for percentiles in aggregate
    const sorted = [...s.elapsedList].sort((a, b) => a - b)
    const p90 = sorted[Math.floor(sorted.length * 0.9)] || s.max
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || s.max
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || s.max

    summaryRows.push([
      label,
      String(s.count),
      String(avg),
      String(s.min === Infinity ? 0 : s.min),
      String(s.max === -Infinity ? 0 : s.max),
      errPct,
      throughput,
      kbPerSec,
      String(avgBytes),
    ])

    aggregateRows.push([
      label,
      String(s.count),
      String(avg),
      String(sorted[Math.floor(sorted.length * 0.5)] || avg),
      String(p90),
      String(p95),
      String(p99),
      String(s.min === Infinity ? 0 : s.min),
      String(s.max === -Infinity ? 0 : s.max),
      errPct,
      throughput,
      kbPerSec,
    ])
  })

  // Add TOTAL row
  if (totalCount > 0) {
    const totalAvg = Math.round(totalElapsedSum / totalCount)
    const totalErrPct = ((totalErrors / totalCount) * 100).toFixed(2) + '%'
    const totalThroughput = (totalCount / Math.max(1, totalElapsedSum / 1000)).toFixed(1) + '/sec'
    const totalKbPerSec = (totalBytesSum / 1024 / Math.max(1, totalElapsedSum / 1000)).toFixed(2)
    const totalAvgBytes = Math.round(totalBytesSum / totalCount)

    summaryRows.push([
      'TOTAL',
      String(totalCount),
      String(totalAvg),
      String(globalMin === Infinity ? 0 : globalMin),
      String(globalMax === -Infinity ? 0 : globalMax),
      totalErrPct,
      totalThroughput,
      totalKbPerSec,
      String(totalAvgBytes),
    ])

    aggregateRows.push([
      'TOTAL',
      String(totalCount),
      String(totalAvg),
      String(totalAvg),
      String(globalMax),
      String(globalMax),
      String(globalMax),
      String(globalMin === Infinity ? 0 : globalMin),
      String(globalMax === -Infinity ? 0 : globalMax),
      totalErrPct,
      totalThroughput,
      totalKbPerSec,
    ])
  }

  const errorRate = totalCount > 0 ? (totalErrors / totalCount) * 100 : 0

  return {
    samples,
    summaryRows,
    aggregateRows,
    errorRate,
    totalSamples: samples.length,
  }
}

function unescapeXmlText(str: string): string {
  if (!str) return ''
  return str
    .replace(/&#x0*([0-9a-fA-F]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
    .replace(/&#0*([0-9]+);/g, (_, dec) => {
      const code = parseInt(dec, 10)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\r\r\n/g, '\r\n')
    .replace(/\r(?!\n)/g, '\n')
}

function parseXmlJtl(xml: string): ParsedJtlResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const httpSamples = Array.from(doc.querySelectorAll('httpSample, sample'))

  const samples: JtlSample[] = httpSamples.map((el, i) => {
    const label = unescapeXmlText(el.getAttribute('lb') || `Sample ${i + 1}`)
    const code = Number(el.getAttribute('rc')) || 200
    const elapsed = Number(el.getAttribute('t')) || 0
    const success = el.getAttribute('s') === 'true'
    const threadName = unescapeXmlText(el.getAttribute('tn') || 'Thread Group 1-1')
    const bytes = Number(el.getAttribute('by')) || 0
    const latency = Number(el.getAttribute('lt')) || 0
    const connectTime = Number(el.getAttribute('ct')) || 0
    const timestampRaw = Number(el.getAttribute('ts')) || Date.now()
    const timestamp = new Date(timestampRaw).toLocaleTimeString()
    const responseData = unescapeXmlText(el.querySelector('responseData')?.textContent || '')
    const samplerData = unescapeXmlText(el.querySelector('samplerData')?.textContent || '')
    const requestHeader = unescapeXmlText(el.querySelector('requestHeader')?.textContent || '')
    const responseHeader = unescapeXmlText(el.querySelector('responseHeader')?.textContent || '')
    const method = el.querySelector('method')?.textContent?.toUpperCase() || 'HTTP'
    const url = unescapeXmlText(el.querySelector('java\\.net\\.URL')?.textContent || '')
    const queryString = unescapeXmlText(el.querySelector('queryString')?.textContent || '')

    let requestContent = ''
    if (samplerData) {
      requestContent = samplerData
    } else if (queryString) {
      requestContent = queryString
    } else if (requestHeader) {
      requestContent = `${method} ${url}\n${requestHeader}`
    } else {
      requestContent = `Thread: ${threadName}\nURL: ${url}`
    }

    return {
      id: `sample-${i + 1}`,
      label,
      code,
      elapsed,
      success,
      method,
      url,
      request: requestContent,
      response: responseData || `Status: ${code} ${success ? 'OK' : 'Error'}\nLatency: ${latency}ms\nBytes: ${bytes}`,
      threadName,
      timestamp,
      bytes,
      sentBytes: 0,
      latency,
      connectTime,
      requestHeaders: requestHeader || undefined,
      responseHeaders: responseHeader || undefined,
    }
  })

  return {
    samples,
    summaryRows: [],
    aggregateRows: [],
    errorRate: samples.length > 0 ? (samples.filter((s) => !s.success).length / samples.length) * 100 : 0,
    totalSamples: samples.length,
  }
}
