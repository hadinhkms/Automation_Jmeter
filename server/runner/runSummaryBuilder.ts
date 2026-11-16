import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { RunSamplesUpdate, RunSummary } from './types'
import { parseJtlFile } from './jtlParser'
import { selectFinalSampleDetails, selectLiveSampleDetails } from './sampleSelection'

/** Full run summary read from a run's results.jtl (+ report presence). */
export function buildRunSummary(
  runId: string,
  exitCode: number | null,
  jtlPath: string,
  reportDir: string,
  status: RunSummary['status'],
): RunSummary {
  const hasReport = existsSync(join(reportDir, 'index.html'))
  const parsed = parseJtlFile(jtlPath)
  return {
    runId,
    status,
    exitCode,
    samples: selectFinalSampleDetails(parsed.samples),
    summaryRows: parsed.summaryRows,
    aggregateRows: parsed.aggregateRows,
    totalSamples: parsed.samples.length,
    errorRate: parsed.errorRate,
    hasReport,
    reportDir,
  }
}

/** Incremental live update with samples after `previousSampleCount`, or null when nothing new arrived. */
export function buildLiveUpdate(
  runId: string,
  jtlPath: string,
  reportDir: string,
  previousSampleCount: number,
): { update: RunSamplesUpdate; sampleCount: number } | null {
  const parsed = parseJtlFile(jtlPath)
  if (parsed.samples.length <= previousSampleCount) return null

  const nextSamples = parsed.samples.slice(previousSampleCount)
  const totalErrors = parsed.samples.filter((sample) => !sample.success).length

  const update: RunSamplesUpdate = {
    runId,
    samples: selectLiveSampleDetails(nextSamples, previousSampleCount),
    summaryRows: parsed.summaryRows,
    aggregateRows: parsed.aggregateRows,
    totalSamples: parsed.samples.length,
    totalErrors,
    errorRate: parsed.errorRate,
    hasReport: existsSync(join(reportDir, 'index.html')),
  }
  return { update, sampleCount: parsed.samples.length }
}
