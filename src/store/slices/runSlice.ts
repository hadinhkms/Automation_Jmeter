import { emptyMetrics, getTotalThreads } from '../jmeterStorePersistence'
import type { SliceCreator } from '../../models/jmeterStore'

type RunKeys =
  | 'startRun'
  | 'stopRun'
  | 'tickRun'
  | 'clearResults'
  | 'setExecutionMode'
  | 'setJMeterConfig'
  | 'setConsoleOpen'
  | 'setSettingsOpen'
  | 'addLog'
  | 'clearLogs'

export const createRunSlice: SliceCreator<RunKeys> = (set, get) => ({
  startRun: () =>
    set((state) => ({
      runState: 'RUNNING',
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(state.testPlan) },
      resultsCleared: false,
      realSamples: [],
      realSummaryRows: [],
      realAggregateRows: [],
      hasHtmlReport: false,
      activeRunId: null,
    })),
  stopRun: () => set({ runState: 'STOPPED', metrics: { ...get().metrics, activeThreads: 0 } }),
  tickRun: () =>
    set((state) => {
      if (state.runState !== 'RUNNING') return state
      const nextDuration = state.metrics.durationSeconds + 1
      const activeThreads = Math.min(
        state.metrics.totalThreads,
        Math.max(1, Math.round(nextDuration * (state.metrics.totalThreads / 12))),
      )
      const increment = 78 + Math.floor(Math.random() * 65)
      const newErrors = Math.random() > 0.78 ? 1 + Math.floor(Math.random() * 2) : 0
      return {
        metrics: {
          ...state.metrics,
          activeThreads,
          samples: state.metrics.samples + increment,
          errors: state.metrics.errors + newErrors,
          throughput: increment,
          durationSeconds: nextDuration,
        },
      }
    }),
  clearResults: () =>
    set((state) => ({
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(state.testPlan) },
      runState: state.runState === 'RUNNING' ? 'RUNNING' : 'READY',
      resultsCleared: true,
      realSamples: [],
      realSummaryRows: [],
      realAggregateRows: [],
      liveLogs: [],
      hasHtmlReport: false,
    })),
  setExecutionMode: (executionMode) => set({ executionMode }),
  setJMeterConfig: (config) =>
    set((state) => ({ jmeterConfig: { ...state.jmeterConfig, ...config } })),
  setConsoleOpen: (isConsoleOpen) => set({ isConsoleOpen }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  addLog: (line, type = 'stdout') =>
    set((state) => ({
      liveLogs: [
        ...state.liveLogs.slice(-299),
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          line,
          type,
          time: new Date().toLocaleTimeString(),
        },
      ],
    })),
  clearLogs: () => set({ liveLogs: [] }),
})
