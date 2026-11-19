import type { LabelStatsMap } from './labelStats'

export function buildJtlStatsRows(labelStats: LabelStatsMap): {
  summaryRows: string[][]
  aggregateRows: string[][]
  errorRate: number
} {
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

  return { summaryRows, aggregateRows, errorRate }
}
