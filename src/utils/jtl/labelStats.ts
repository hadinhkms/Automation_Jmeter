export interface LabelStat {
  count: number
  elapsedList: number[]
  errors: number
  bytesTotal: number
  sentBytesTotal: number
  min: number
  max: number
}

export type LabelStatsMap = Record<string, LabelStat>

export function accumulateLabelStat(
  labelStats: LabelStatsMap,
  label: string,
  elapsed: number,
  success: boolean,
  bytes: number,
  sentBytes: number,
): void {
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
