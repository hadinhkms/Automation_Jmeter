// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  XCircle,
  Zap,
} from 'lucide-react'
import type { JtlSample } from '../../../server/jmeterRunner'
import type { SlaEvaluationResult, SlaThresholds } from '../../models/jmeter'
import { evaluateSla } from '../../utils/slaEvaluator'

interface LiveMetricsDashboardProps {
  samples: JtlSample[]
  summaryRows?: string[][]
  aggregateRows?: string[][]
  runMetrics?: {
    samples: number
    errors: number
    throughput: number
    activeThreads: number
    durationSeconds: number
  }
  slaThresholds?: SlaThresholds
  isRunning?: boolean
}

export function LiveMetricsDashboard({
  samples,
  summaryRows: _summaryRows = [],
  aggregateRows: _aggregateRows = [],
  runMetrics,
  slaThresholds,
  isRunning = false,
}: LiveMetricsDashboardProps) {
  // Compute percentiles and latency stats
  const stats = useMemo(() => {
    if (!samples || samples.length === 0) {
      return {
        total: 0,
        errors: 0,
        errorRate: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        throughput: runMetrics?.throughput || 0,
        code2xx: 0,
        code3xx: 0,
        code4xx: 0,
        code5xx: 0,
        otherCodes: 0,
      }
    }

    const total = samples.length
    const errors = samples.filter((s) => !s.success).length
    const errorRate = total > 0 ? (errors / total) * 100 : 0

    const sortedElapsed = [...samples.map((s) => s.elapsed)].sort((a, b) => a - b)
    const sum = sortedElapsed.reduce((acc, v) => acc + v, 0)
    const avg = Math.round(sum / total)
    const min = sortedElapsed[0] ?? 0
    const max = sortedElapsed[sortedElapsed.length - 1] ?? 0

    const getPercentile = (p: number) => {
      const idx = Math.min(Math.floor((p / 100) * sortedElapsed.length), sortedElapsed.length - 1)
      return sortedElapsed[idx] ?? 0
    }

    const p50 = getPercentile(50)
    const p90 = getPercentile(90)
    const p95 = getPercentile(95)
    const p99 = getPercentile(99)

    let code2xx = 0
    let code3xx = 0
    let code4xx = 0
    let code5xx = 0
    let otherCodes = 0

    samples.forEach((s) => {
      const c = Number(s.code)
      if (c >= 200 && c < 300) code2xx++
      else if (c >= 300 && c < 400) code3xx++
      else if (c >= 400 && c < 500) code4xx++
      else if (c >= 500 && c < 600) code5xx++
      else otherCodes++
    })

    return {
      total,
      errors,
      errorRate,
      avg,
      min,
      max,
      p50,
      p90,
      p95,
      p99,
      throughput: runMetrics?.throughput || (total / Math.max(1, runMetrics?.durationSeconds || 1)),
      code2xx,
      code3xx,
      code4xx,
      code5xx,
      otherCodes,
    }
  }, [samples, runMetrics])

  // Top slowest samplers
  const topSlowest = useMemo(() => {
    const labelMap = new Map<string, { label: string; count: number; totalElapsed: number; errors: number; maxElapsed: number }>()

    samples.forEach((s) => {
      const entry = labelMap.get(s.label) || { label: s.label, count: 0, totalElapsed: 0, errors: 0, maxElapsed: 0 }
      entry.count++
      entry.totalElapsed += s.elapsed
      entry.maxElapsed = Math.max(entry.maxElapsed, s.elapsed)
      if (!s.success) entry.errors++
      labelMap.set(s.label, entry)
    })

    return Array.from(labelMap.values())
      .map((e) => ({
        label: e.label,
        count: e.count,
        avg: Math.round(e.totalElapsed / e.count),
        max: e.maxElapsed,
        errorRate: ((e.errors / e.count) * 100).toFixed(1),
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
  }, [samples])

  // Evaluate SLA if enabled
  const slaResult: SlaEvaluationResult | null = useMemo(() => {
    if (!slaThresholds || !slaThresholds.enabled || samples.length === 0) return null
    return evaluateSla(slaThresholds, {
      totalSamples: stats.total,
      errors: stats.errors,
      errorRate: stats.errorRate,
      avgLatency: stats.avg,
      p90Latency: stats.p90,
      p95Latency: stats.p95,
      p99Latency: stats.p99,
      throughput: stats.throughput,
    })
  }, [slaThresholds, samples.length, stats])

  // SVG Trend Points
  const trendPoints = useMemo(() => {
    if (samples.length === 0) return []
    const bucketCount = Math.min(40, samples.length)
    const bucketSize = Math.max(1, Math.floor(samples.length / bucketCount))
    const pts: { x: number; avg: number; p95: number }[] = []

    for (let i = 0; i < samples.length; i += bucketSize) {
      const slice = samples.slice(i, i + bucketSize)
      if (slice.length === 0) continue
      const elapseds = slice.map((s) => s.elapsed).sort((a, b) => a - b)
      const sum = elapseds.reduce((a, b) => a + b, 0)
      const avg = Math.round(sum / elapseds.length)
      const p95 = elapseds[Math.floor(elapseds.length * 0.95)] || elapseds[elapseds.length - 1]
      pts.push({ x: i, avg, p95 })
    }
    return pts
  }, [samples])

  const maxChartLatency = Math.max(...trendPoints.map((p) => Math.max(p.avg, p.p95)), 10)

  return (
    <div className="live-metrics-dashboard" style={{ padding: '16px 20px', height: '100%', overflowY: 'auto' }}>
      {/* SLA Status Banner */}
      {slaResult && (
        <div
          style={{
            background: slaResult.passed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${slaResult.passed ? '#10b981' : '#ef4444'}`,
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {slaResult.passed ? <CheckCircle2 size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />}
            <div>
              <strong style={{ color: slaResult.passed ? '#10b981' : '#ef4444', fontSize: 14 }}>
                {slaResult.passed ? 'SLA Quality Gates: PASSED' : 'SLA Quality Gates: FAILED (Thresholds Breached)'}
              </strong>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{slaResult.summaryText}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {slaResult.rules.map((r, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: r.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.25)',
                  color: r.passed ? '#34d399' : '#f87171',
                  fontWeight: 600,
                }}
              >
                {r.name}: {r.actual}{r.unit} ({r.operator}{r.target})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="metrics-card" style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.04))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted, #888)' }}>
            <span>Total Requests</span>
            <Activity size={16} color="#60a5fa" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: '#93c5fd' }}>
            {stats.total.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>
            {isRunning ? '🟢 Stream live executing...' : 'Completed samples'}
          </div>
        </div>

        <div className="metrics-card" style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.04))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted, #888)' }}>
            <span>Throughput (RPS)</span>
            <Zap size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: '#34d399' }}>
            {stats.throughput.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 400 }}>req/s</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>
            Duration: {runMetrics?.durationSeconds || 0}s
          </div>
        </div>

        <div className="metrics-card" style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.04))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted, #888)' }}>
            <span>Avg Latency (ms)</span>
            <Clock size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: '#fbbf24' }}>
            {stats.avg} <span style={{ fontSize: 13, fontWeight: 400 }}>ms</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>
            Min: {stats.min}ms | Max: {stats.max}ms
          </div>
        </div>

        <div className="metrics-card" style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.04))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted, #888)' }}>
            <span>Error Rate</span>
            <AlertTriangle size={16} color={stats.errorRate > 0 ? '#ef4444' : '#10b981'} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: stats.errorRate > 0 ? '#f87171' : '#34d399' }}>
            {stats.errorRate.toFixed(2)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>
            {stats.errors} failed / {stats.total} total
          </div>
        </div>
      </div>

      {/* Percentiles Row */}
      <div style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.03))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)', marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #888)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gauge size={16} color="#8b5cf6" /> Live Response Time Percentiles (SLA Indicators)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>P50 (Median)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#93c5fd', marginTop: 4 }}>{stats.p50} ms</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>P90</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa', marginTop: 4 }}>{stats.p90} ms</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>P95</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f472b6', marginTop: 4 }}>{stats.p95} ms</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>P99</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fb7185', marginTop: 4 }}>{stats.p99} ms</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>Max Peak</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f87171', marginTop: 4 }}>{stats.max} ms</div>
          </div>
        </div>
      </div>

      {/* Latency Timeline & HTTP Codes */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 16 }}>
        {/* Timeline Chart */}
        <div style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.03))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Response Time Timeline (Avg vs P95)</h4>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>● Avg Latency</span>
              <span style={{ color: '#f472b6', display: 'flex', alignItems: 'center', gap: 4 }}>● P95 Latency</span>
            </div>
          </div>

          <svg viewBox="0 0 500 160" style={{ width: '100%', height: 160, overflow: 'visible' }}>
            <line x1="40" y1="15" x2="490" y2="15" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <line x1="40" y1="75" x2="490" y2="75" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <line x1="40" y1="135" x2="490" y2="135" stroke="rgba(255,255,255,0.2)" />
            <line x1="40" y1="10" x2="40" y2="135" stroke="rgba(255,255,255,0.2)" />

            <text x="32" y="19" fill="#888" fontSize="10" textAnchor="end">{maxChartLatency}</text>
            <text x="32" y="79" fill="#888" fontSize="10" textAnchor="end">{Math.round(maxChartLatency / 2)}</text>
            <text x="32" y="138" fill="#888" fontSize="10" textAnchor="end">0</text>

            {trendPoints.length > 1 && (
              <>
                {/* P95 Line */}
                <path
                  d={trendPoints.map((p, i) => {
                    const x = 40 + (i / (trendPoints.length - 1)) * 450
                    const y = 135 - (p.p95 / maxChartLatency) * 120
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="#f472b6"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />

                {/* Avg Line */}
                <path
                  d={trendPoints.map((p, i) => {
                    const x = 40 + (i / (trendPoints.length - 1)) * 450
                    const y = 135 - (p.avg / maxChartLatency) * 120
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                />
              </>
            )}
          </svg>
        </div>

        {/* HTTP Status Breakdown */}
        <div style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.03))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 600 }}>HTTP Response Codes</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: '#34d399' }}>2xx Success</span>
                <span>{stats.code2xx} ({stats.total > 0 ? ((stats.code2xx / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.total > 0 ? (stats.code2xx / stats.total) * 100 : 0}%`, background: '#10b981' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: '#60a5fa' }}>3xx Redirect</span>
                <span>{stats.code3xx} ({stats.total > 0 ? ((stats.code3xx / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.total > 0 ? (stats.code3xx / stats.total) * 100 : 0}%`, background: '#3b82f6' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: '#fbbf24' }}>4xx Client Error</span>
                <span>{stats.code4xx} ({stats.total > 0 ? ((stats.code4xx / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.total > 0 ? (stats.code4xx / stats.total) * 100 : 0}%`, background: '#f59e0b' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: '#f87171' }}>5xx Server Error</span>
                <span>{stats.code5xx} ({stats.total > 0 ? ((stats.code5xx / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.total > 0 ? (stats.code5xx / stats.total) * 100 : 0}%`, background: '#ef4444' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Slowest Requests Table */}
      {topSlowest.length > 0 && (
        <div style={{ background: 'var(--panel-bg-subtle, rgba(255,255,255,0.03))', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #333)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 600 }}>Top Slowest Transactions</h4>
          <table className="results-table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color, #444)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Transaction / Sampler</th>
                <th style={{ padding: '6px 8px' }}>Count</th>
                <th style={{ padding: '6px 8px' }}>Avg Latency</th>
                <th style={{ padding: '6px 8px' }}>Max Latency</th>
                <th style={{ padding: '6px 8px' }}>Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {topSlowest.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 500 }}>{row.label}</td>
                  <td style={{ padding: '6px 8px' }}>{row.count}</td>
                  <td style={{ padding: '6px 8px', color: '#fbbf24' }}>{row.avg} ms</td>
                  <td style={{ padding: '6px 8px', color: '#f87171' }}>{row.max} ms</td>
                  <td style={{ padding: '6px 8px', color: Number(row.errorRate) > 0 ? '#ef4444' : '#10b981' }}>
                    {row.errorRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
