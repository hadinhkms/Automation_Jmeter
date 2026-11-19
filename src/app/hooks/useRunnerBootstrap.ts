import { useEffect } from 'react'
import { jmeterRunnerService } from '../../services/jmeterRunnerService'
import type { AppStore } from '../appTypes'

/** Initial detection of JMeter & previous run results (runs once on mount). */
export function useRunnerBootstrap(store: AppStore, selectResultsListener: () => void) {
  useEffect(() => {
    jmeterRunnerService.detectJMeter().then((res) => {
      store.setJMeterConfig({
        path: res.path || '',
        found: res.found,
        version: res.version,
      })
    }).catch(() => {})

    // Sync runner status on mount
    jmeterRunnerService.getStatus().then((st) => {
      if (st && st.isRunning) {
        store.startRun()
        if (st.currentRunId) {
          store.startRunResults(st.currentRunId)
        }
        selectResultsListener()
      }
    }).catch(() => {})

    // Load previous run results if available
    jmeterRunnerService.getResults().then((results) => {
      if (results && results.samples && results.samples.length > 0) {
        store.setRunResults({
          samples: results.samples,
          summaryRows: results.summaryRows,
          aggregateRows: results.aggregateRows,
          hasReport: results.hasReport,
          runId: results.runId,
        })
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/** Mock runner tick interval (only when in mock mode). */
export function useMockRunTicker(store: AppStore) {
  useEffect(() => {
    if (store.runState !== 'RUNNING' || store.executionMode !== 'mock') return
    const interval = window.setInterval(store.tickRun, 1000)
    return () => window.clearInterval(interval)
  }, [store.runState, store.executionMode, store.tickRun])
}
