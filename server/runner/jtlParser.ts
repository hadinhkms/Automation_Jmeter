import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { JtlSample, ParsedJtl } from './types'
import { parseVrtXml } from './vrtParser'
import { buildStatRows, recordLabelStat, type LabelStat } from './jtlStats'

const EMPTY_RESULT = (): ParsedJtl => ({ samples: [], summaryRows: [], aggregateRows: [], errorRate: 0 })

export function parseCsvLine(line: string): string[] {
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

function headerIndexes(headers: string[]) {
  return {
    timeStamp: headers.indexOf('timeStamp'),
    elapsed: headers.indexOf('elapsed'),
    label: headers.indexOf('label'),
    responseCode: headers.indexOf('responseCode'),
    responseMessage: headers.indexOf('responseMessage'),
    threadName: headers.indexOf('threadName'),
    success: headers.indexOf('success'),
    failureMessage: headers.indexOf('failureMessage'),
    bytes: headers.indexOf('bytes'),
    sentBytes: headers.indexOf('sentBytes'),
    latency: headers.indexOf('Latency'),
    connect: headers.indexOf('Connect'),
    url: headers.indexOf('URL'),
  }
}

/** Parses a JMeter CSV .jtl (enriched with sibling vrt_results.xml when present) into samples + report rows. */
export function parseJtlFile(jtlPath: string): ParsedJtl {
  if (!existsSync(jtlPath)) {
    return EMPTY_RESULT()
  }

  try {
    const vrtPath = join(dirname(jtlPath), 'vrt_results.xml')
    const vrtData = existsSync(vrtPath) ? parseVrtXml(vrtPath) : new Map<string | number, Partial<JtlSample>>()

    const content = readFileSync(jtlPath, 'utf-8')
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
    if (lines.length <= 1) {
      return EMPTY_RESULT()
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.trim())
    const idx = headerIndexes(headers)
    const samples: JtlSample[] = []
    const labelStats: Record<string, LabelStat> = {}

    for (let i = 1; i < lines.length; i += 1) {
      const row = parseCsvLine(lines[i])
      if (row.length < headers.length) continue

      const label = row[idx.label] || `Sample ${i}`
      const elapsed = Number(row[idx.elapsed]) || 0
      const success = (row[idx.success] || '').toLowerCase() === 'true'
      const code = Number(row[idx.responseCode]) || (success ? 200 : 500)
      const bytes = Number(row[idx.bytes]) || 0
      const sentBytes = Number(row[idx.sentBytes]) || 0
      const latency = Number(row[idx.latency]) || 0
      const connect = Number(row[idx.connect]) || 0
      const threadName = row[idx.threadName] || ''
      const timestamp = row[idx.timeStamp] ? new Date(Number(row[idx.timeStamp])).toLocaleTimeString() : ''
      const url = (idx.url !== -1 ? row[idx.url] : '') || ''
      const respMsg = (idx.responseMessage !== -1 ? row[idx.responseMessage] : '') || ''
      const failureMsg = (idx.failureMessage !== -1 ? row[idx.failureMessage] : '') || ''

      const rawTs = idx.timeStamp !== -1 ? String(row[idx.timeStamp]).trim() : ''
      const vrt = (rawTs ? vrtData.get(`${rawTs}_${label}`) : null)
        || (rawTs ? vrtData.get(rawTs) : null)
        || vrtData.get(i)
      const finalUrl = vrt?.url || url
      const finalMethod = vrt?.method || 'HTTP'
      const finalRequest = vrt?.request || `Thread: ${threadName}\nURL: ${finalUrl}`
      const failureLine = failureMsg ? `\nFailure: ${failureMsg}` : ''
      const finalResponse = vrt?.response
        || `Status: ${code} ${respMsg}${failureLine}\nLatency: ${latency}ms\nConnect: ${connect}ms\nBytes: ${bytes}`

      samples.push({
        id: `sample-${i}`,
        label: vrt?.label || label,
        code: vrt?.code !== undefined ? vrt.code : code,
        elapsed: vrt?.elapsed !== undefined ? vrt.elapsed : elapsed,
        success: vrt?.success !== undefined ? vrt.success : success,
        method: finalMethod,
        url: finalUrl,
        request: finalRequest,
        response: finalResponse,
        threadName: vrt?.threadName || threadName,
        timestamp: vrt?.timestamp || timestamp,
        bytes: vrt?.bytes !== undefined ? vrt.bytes : bytes,
        sentBytes: vrt?.sentBytes !== undefined ? vrt.sentBytes : sentBytes,
        latency: vrt?.latency !== undefined ? vrt.latency : latency,
        connectTime: vrt?.connectTime !== undefined ? vrt.connectTime : connect,
        requestHeaders: vrt?.requestHeaders,
        responseHeaders: vrt?.responseHeaders,
      })

      recordLabelStat(labelStats, label, elapsed, success, bytes, sentBytes)
    }

    const { summaryRows, aggregateRows, errorRate } = buildStatRows(labelStats)
    return { samples, summaryRows, aggregateRows, errorRate }
  } catch (err) {
    console.warn('Failed to parse JTL file:', err)
    return EMPTY_RESULT()
  }
}
