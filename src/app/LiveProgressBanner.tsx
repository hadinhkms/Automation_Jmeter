import { Activity, BarChart3 } from 'lucide-react'
import type { RunMetrics } from '../models/jmeter'

export function LiveProgressBanner({ metrics }: { metrics: RunMetrics }) {
  const liveErrorRate = metrics.samples > 0
    ? (metrics.errors / metrics.samples) * 100
    : 0
  const liveMinutes = Math.floor(metrics.durationSeconds / 60)
  const liveSeconds = String(metrics.durationSeconds % 60).padStart(2, '0')

  return (
    <div className="live-progress-banner" role="status" aria-live="polite">
      <div className="live-progress-title">
        <Activity size={15} />
        <span>JMeter running</span>
      </div>
      <div className="live-progress-metrics">
        <span><BarChart3 size={13} /> {metrics.samples.toLocaleString()} samples</span>
        <span>{metrics.throughput.toFixed(1)} req/s</span>
        <span>{metrics.errors.toLocaleString()} errors</span>
        <span>{liveErrorRate.toFixed(2)}% error rate</span>
        <span>{liveMinutes}:{liveSeconds}</span>
      </div>
    </div>
  )
}
