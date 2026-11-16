import type { RunProgressMetrics } from './types'

const SUMMARY_LINE_REGEX = /summary\s*([+=])\s*(\d+)\s+in\s+([\d:]+)\s*=\s*([\d.]+)\/s\s+Avg:\s*(\d+)\s+Min:\s*(\d+)\s+Max:\s*(\d+)\s+Err:\s*(\d+)\s*\(([\d.]+)%\)/

/** Repeated JVM deprecation warnings that only clutter the console. */
export function isSuppressedLogLine(trimmed: string): boolean {
  return (
    trimmed.includes('Warning: Nashorn engine is planned to be removed') ||
    trimmed.includes('WARN StatusConsoleListener The use of package scanning')
  )
}

/** Parses a JMeter `summary +/=` console line into progress metrics, or null if it is not one. */
export function parseSummaryLine(trimmed: string): RunProgressMetrics | null {
  const summaryMatch = trimmed.match(SUMMARY_LINE_REGEX)
  if (!summaryMatch) return null
  const [, , countStr, , throughputStr, avgStr, minStr, maxStr, errStr] = summaryMatch
  return {
    samples: Number(countStr) || 0,
    errors: Number(errStr) || 0,
    throughput: Number(throughputStr) || 0,
    avgTime: Number(avgStr) || 0,
    minTime: Number(minStr) || 0,
    maxTime: Number(maxStr) || 0,
    activeThreads: 0,
    durationSeconds: 0,
  }
}
