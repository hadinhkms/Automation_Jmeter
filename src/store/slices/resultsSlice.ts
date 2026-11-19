import type { SliceCreator } from '../../models/jmeterStore'

type ResultsKeys = 'startRunResults' | 'appendRunSamples' | 'setRunResults' | 'updateProgressMetrics'

export const createResultsSlice: SliceCreator<ResultsKeys> = (set) => ({
  startRunResults: (runId) =>
    set((state) => {
      if (state.activeRunId === runId) {
        return {
          activeRunId: runId,
          hasHtmlReport: false,
          resultsCleared: false,
        }
      }

      return {
        activeRunId: runId,
        realSamples: [],
        realSummaryRows: [],
        realAggregateRows: [],
        hasHtmlReport: false,
        resultsCleared: false,
      }
    }),
  appendRunSamples: (update) =>
    set((state) => {
      const shouldReplace = Boolean(state.activeRunId && state.activeRunId !== update.runId)
      const currentSamples = shouldReplace ? [] : state.realSamples
      const merged = shouldReplace ? [...update.samples] : [...currentSamples]
      const indexById = new Map(merged.map((sample, index) => [sample.id, index]))

      if (!shouldReplace) {
        for (const sample of update.samples) {
          const index = indexById.get(sample.id)
          if (index === undefined) {
            indexById.set(sample.id, merged.length)
            merged.push(sample)
          } else {
            merged[index] = sample
          }
        }
      }

      const errors = merged.filter((sample) => !sample.success).length

      return {
        activeRunId: update.runId,
        realSamples: merged,
        realSummaryRows: update.summaryRows,
        realAggregateRows: update.aggregateRows,
        hasHtmlReport: update.hasReport,
        resultsCleared: false,
        metrics: {
          ...state.metrics,
          samples: Math.max(state.metrics.samples, update.totalSamples),
          errors: Math.max(state.metrics.errors, update.totalErrors, errors),
        },
      }
    }),
  setRunResults: (results) =>
    set({
      realSamples: results.samples,
      realSummaryRows: results.summaryRows,
      realAggregateRows: results.aggregateRows,
      hasHtmlReport: results.hasReport,
      activeRunId: results.runId ?? null,
      resultsCleared: false,
    }),
  updateProgressMetrics: (metrics) =>
    set((state) => ({
      metrics: {
        ...state.metrics,
        ...metrics,
        samples: metrics.samples === undefined ? state.metrics.samples : Math.max(state.metrics.samples, metrics.samples),
        errors: metrics.errors === undefined ? state.metrics.errors : Math.max(state.metrics.errors, metrics.errors),
      },
    })),
})
