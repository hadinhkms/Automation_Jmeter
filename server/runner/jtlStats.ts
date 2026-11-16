export interface LabelStat {
  count: number
  elapsedList: number[]
  errors: number
  bytesTotal: number
  sentBytesTotal: number
  min: number
  max: number
}

export function recordLabelStat(
  labelStats: Record<string, LabelStat>,
  label: string,
  elapsed: number,
  success: boolean,
  bytes: number,
  sentBytes: number,
) {
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

/** Builds Summary Report + Aggregate Report rows (per label + TOTAL) and the overall error rate. */
export function buildStatRows(labelStats: Record<string, LabelStat>) {
  const summaryRows: string[][] = []
  const aggregateRows: string[][] = []
  let totalCount = 0
  let totalErrors = 0
  let totalElapsedSum = 0
  let globalMin = Infinity
  let globalMax = -Infinity
  let totalBytes = 0
  let totalSentBytes = 0

  for (const [label, stat] of Object.entries(labelStats)) {
    stat.elapsedList.sort((a, b) => a - b)
    const count = stat.count
    const avg = Math.round(stat.elapsedList.reduce((a, b) => a + b, 0) / count)
    const min = stat.min === Infinity ? 0 : stat.min
    const max = stat.max === -Infinity ? 0 : stat.max
    const errPercent = ((stat.errors / count) * 100).toFixed(2) + '%'
    const median = stat.elapsedList[Math.floor(count * 0.5)] || 0
    const p90 = stat.elapsedList[Math.floor(count * 0.9)] || max
    const p95 = stat.elapsedList[Math.floor(count * 0.95)] || max
    const p99 = stat.elapsedList[Math.floor(count * 0.99)] || max

    const variance = stat.elapsedList.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count
    const stdDev = Math.sqrt(variance).toFixed(1)
    const throughput = `${(count / Math.max(1, (max - min) / 1000 || 1)).toFixed(1)}`
    const receivedKb = (stat.bytesTotal / 1024).toFixed(1)
    const sentKb = (stat.sentBytesTotal / 1024).toFixed(1)

    summaryRows.push([
      label, count.toLocaleString(), String(avg), String(min), String(max), stdDev, errPercent,
      throughput, receivedKb, sentKb, String(Math.round(stat.bytesTotal / count)),
    ])

    aggregateRows.push([
      label, count.toLocaleString(), String(avg), String(median), String(p90), String(p95), String(p99),
      String(min), String(max), errPercent, throughput, receivedKb, sentKb,
    ])

    totalCount += count
    totalErrors += stat.errors
    totalElapsedSum += stat.elapsedList.reduce((a, b) => a + b, 0)
    totalBytes += stat.bytesTotal
    totalSentBytes += stat.sentBytesTotal
    if (min < globalMin) globalMin = min
    if (max > globalMax) globalMax = max
  }

  if (totalCount > 0) {
    const totalAvg = Math.round(totalElapsedSum / totalCount)
    const totalErrPercent = ((totalErrors / totalCount) * 100).toFixed(2) + '%'
    const minStr = String(globalMin === Infinity ? 0 : globalMin)
    const maxStr = String(globalMax === -Infinity ? 0 : globalMax)
    const receivedKb = (totalBytes / 1024).toFixed(1)
    const sentKb = (totalSentBytes / 1024).toFixed(1)
    summaryRows.push([
      'TOTAL', totalCount.toLocaleString(), String(totalAvg), minStr, maxStr, '--', totalErrPercent,
      '--', receivedKb, sentKb, String(Math.round(totalBytes / totalCount)),
    ])

    aggregateRows.push([
      'TOTAL', totalCount.toLocaleString(), String(totalAvg), '--', '--', '--', '--',
      minStr, maxStr, totalErrPercent, '--', receivedKb, sentKb,
    ])
  }

  const errorRate = totalCount > 0 ? (totalErrors / totalCount) * 100 : 0
  return { summaryRows, aggregateRows, errorRate }
}
