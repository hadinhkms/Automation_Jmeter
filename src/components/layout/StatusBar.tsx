import type { RunMetrics, RunState } from '../../models/jmeter'

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export function StatusBar({ state, metrics, dirty }: { state: RunState; metrics: RunMetrics; dirty: boolean }) {
  const errorRate = metrics.samples ? (metrics.errors / metrics.samples) * 100 : 0
  return (
    <footer className="status-bar">
      <span className={`run-state state-${state.toLowerCase()}`}><i />{state}</span>
      {dirty ? <span className="dirty-state">Unsaved changes</span> : <span>Saved</span>}
      <span className="status-spacer" />
      <span>Threads: <strong>{metrics.activeThreads} / {metrics.totalThreads}</strong></span>
      <span>Samples: <strong>{metrics.samples.toLocaleString()}</strong></span>
      <span>Errors: <strong>{metrics.errors}</strong></span>
      <span>Error: <strong>{errorRate.toFixed(2)}%</strong></span>
      <span>Throughput: <strong>{metrics.throughput} req/s</strong></span>
      <span>Duration: <strong>{formatDuration(metrics.durationSeconds)}</strong></span>
    </footer>
  )
}
