import { jmeterRunnerService } from '../../services/jmeterRunnerService'
import { evaluateSamplesSla } from '../../utils/slaEvaluator'
import type { SlaThresholds } from '../../models/jmeter'
import type { AppStore, NotifyFn } from '../appTypes'

type StreamCallbacks = Parameters<typeof jmeterRunnerService.connectStream>[0]

/** Live-stream callbacks for a real JMeter CLI run: logs, progress, samples, SLA evaluation on completion. */
export function createRunStreamHandlers(store: AppStore, dismissNoticeLater: NotifyFn): StreamCallbacks {
  return {
    onStart: (data) => {
      if (data.runId) {
        store.startRunResults(data.runId)
      }
    },
    onLog: (line, type) => {
      store.addLog(line, type)
    },
    onProgress: (metrics) => {
      store.updateProgressMetrics({
        samples: metrics.samples,
        errors: metrics.errors,
        throughput: metrics.throughput,
        activeThreads: metrics.activeThreads,
        durationSeconds: metrics.durationSeconds,
      })
    },
    onSamples: (update) => {
      store.appendRunSamples({
        runId: update.runId,
        samples: update.samples,
        summaryRows: update.summaryRows,
        aggregateRows: update.aggregateRows,
        totalSamples: update.totalSamples,
        totalErrors: update.totalErrors,
        hasReport: update.hasReport,
      })
    },
    onComplete: async (summary) => {
      let finalResults = summary
      try {
        const fresh = await jmeterRunnerService.getResults(summary.runId)
        if (fresh && fresh.samples && fresh.samples.length > 0) {
          finalResults = fresh
        }
      } catch {
        // fallback
      }

      store.setRunResults({
        samples: finalResults.samples,
        summaryRows: finalResults.summaryRows,
        aggregateRows: finalResults.aggregateRows,
        hasReport: finalResults.hasReport,
        runId: finalResults.runId,
      })
      store.stopRun()
      // SAFETY: test-plan property is written only by its own settings editor with this shape; undefined when unset
      const slaThresholds = store.testPlan.properties.slaThresholds as SlaThresholds | undefined
      if (slaThresholds && slaThresholds.enabled && finalResults.samples && finalResults.samples.length > 0) {
        const slaRes = evaluateSamplesSla(slaThresholds, finalResults.samples, finalResults.summaryRows)
        if (!slaRes.passed) {
          const failedText = slaRes.rules.filter(r => !r.passed).map(r => `${r.name} (${r.actual}${r.unit} > ${r.target}${r.unit})`).join(', ')
          dismissNoticeLater(`Warning: Quality Gate Failed: ${failedText}`, 'error')
        } else {
          dismissNoticeLater('Success: All SLA Quality Gate thresholds passed successfully!', 'info')
        }
      } else {
        dismissNoticeLater(
          finalResults.status === 'completed'
            ? `JMeter finished (${finalResults.totalSamples} samples loaded, ${finalResults.errorRate.toFixed(2)}% errors).`
            : `JMeter run ended (${finalResults.totalSamples} samples, exit code ${finalResults.exitCode}).`,
          'info',
        )
      }
    },

    onStopped: () => {
      store.stopRun()
      dismissNoticeLater('JMeter run was stopped.')
    },
    onError: (err) => {
      store.stopRun()
      dismissNoticeLater(err, 'error')
    },
  }
}
