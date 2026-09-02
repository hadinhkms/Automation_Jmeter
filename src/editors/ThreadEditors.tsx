import { useMemo } from 'react'
import type { TableRow, TestPlanNode } from '../models/jmeter'
import { FormField, SelectField, Section } from '../components/common/FormControls'
import { EditableTable } from '../components/common/EditableTable'
import { BarChart2 } from 'lucide-react'

interface EditorProps {
  node: TestPlanNode
  updateProperties: (updates: Record<string, unknown>) => void
}

/**
 * Helper to render an SVG workload curve graph
 */
export function WorkloadCurvePreview({
  points,
  unit = 's',
  height = 180,
}: {
  points: { time: number; vus: number }[]
  unit?: string
  height?: number
}) {
  const { maxTime, maxVus, svgPath, areaPath } = useMemo(() => {
    if (!points || points.length === 0) {
      return { maxTime: 0, maxVus: 0, svgPath: '', areaPath: '' }
    }

    const tMax = Math.max(...points.map((p) => p.time), 1)
    const vMax = Math.max(...points.map((p) => p.vus), 1)

    const w = 560
    const h = height - 40
    const padL = 45
    const padB = 25
    const padT = 15
    const padR = 20

    const plotW = w - padL - padR
    const plotH = h - padT - padB

    const coords = points.map((p) => {
      const x = padL + (p.time / tMax) * plotW
      const y = padT + plotH - (p.vus / vMax) * plotH
      return { x, y, time: p.time, vus: p.vus }
    })

    if (coords.length === 0) return { maxTime: tMax, maxVus: vMax, svgPath: '', areaPath: '' }

    let path = `M ${coords[0].x} ${coords[0].y}`
    for (let i = 1; i < coords.length; i++) {
      path += ` L ${coords[i].x} ${coords[i].y}`
    }

    const area = `${path} L ${coords[coords.length - 1].x} ${padT + plotH} L ${coords[0].x} ${padT + plotH} Z`

    return { maxTime: tMax, maxVus: vMax, svgPath: path, areaPath: area }
  }, [points, height])

  return (
    <div style={{ marginTop: '16px', background: 'var(--bg-panel, #1e1e2e)', borderRadius: '8px', border: '1px solid var(--border-color, #333)', padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-color, #fff)' }}>
          <BarChart2 size={16} style={{ color: '#3b82f6' }} />
          <span>Visual Workload Curve (Virtual Users vs. Time)</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted, #888)' }}>
          <span>Max VUs: <strong style={{ color: '#60a5fa' }}>{maxVus} threads</strong></span>
          <span>Duration: <strong style={{ color: '#a78bfa' }}>{maxTime} {unit}</strong></span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg viewBox="0 0 560 180" style={{ width: '100%', maxHeight: '200px', display: 'block' }}>
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="45" y1="15" x2="540" y2="15" stroke="var(--border-color, #333)" strokeDasharray="3 3" />
          <line x1="45" y1="65" x2="540" y2="65" stroke="var(--border-color, #333)" strokeDasharray="3 3" />
          <line x1="45" y1="115" x2="540" y2="115" stroke="var(--border-color, #333)" strokeDasharray="3 3" />
          <line x1="45" y1="155" x2="540" y2="155" stroke="var(--border-color, #444)" />
          <line x1="45" y1="15" x2="45" y2="155" stroke="var(--border-color, #444)" />

          {/* Y Axis Labels */}
          <text x="40" y="20" textAnchor="end" fontSize="10" fill="var(--text-muted, #888)">{maxVus}</text>
          <text x="40" y="70" textAnchor="end" fontSize="10" fill="var(--text-muted, #888)">{Math.round(maxVus / 2)}</text>
          <text x="40" y="155" textAnchor="end" fontSize="10" fill="var(--text-muted, #888)">0</text>

          {/* X Axis Labels */}
          <text x="45" y="170" textAnchor="start" fontSize="10" fill="var(--text-muted, #888)">0 {unit}</text>
          <text x="290" y="170" textAnchor="middle" fontSize="10" fill="var(--text-muted, #888)">{Math.round(maxTime / 2)} {unit}</text>
          <text x="540" y="170" textAnchor="end" fontSize="10" fill="var(--text-muted, #888)">{maxTime} {unit}</text>

          {/* Area & Line */}
          {areaPath ? <path d={areaPath} fill="url(#curveGradient)" /> : null}
          {svgPath ? <path d={svgPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" /> : null}

          {/* Keypoints */}
          {points.map((p, idx) => {
            const tMax = Math.max(maxTime, 1)
            const vMax = Math.max(maxVus, 1)
            const x = 45 + (p.time / tMax) * (540 - 45)
            const y = 15 + (155 - 15) - (p.vus / vMax) * (155 - 15)
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="3.5"
                fill="#60a5fa"
                stroke="#1e1e2e"
                strokeWidth="1.5"
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export function ConcurrencyThreadGroupEditor({ node, updateProperties }: EditorProps) {
  const targetConcurrency = Number(node.properties.targetConcurrency ?? 50)
  const rampUpTime = Number(node.properties.rampUpTime ?? 60)
  const rampUpSteps = Math.max(1, Number(node.properties.rampUpSteps ?? 5))
  const holdRateTime = Number(node.properties.holdRateTime ?? 300)
  const unitStr = String(node.properties.timeUnit ?? 'S').toUpperCase() === 'M' ? 'min' : 'sec'

  const points = useMemo(() => {
    const pts: { time: number; vus: number }[] = [{ time: 0, vus: 0 }]
    const stepDuration = rampUpSteps > 0 ? rampUpTime / rampUpSteps : 0
    const vusPerStep = rampUpSteps > 0 ? targetConcurrency / rampUpSteps : 0

    let curTime = 0
    let curVus = 0
    for (let step = 1; step <= rampUpSteps; step++) {
      curTime += stepDuration
      curVus = Math.round(step * vusPerStep)
      pts.push({ time: Math.round(curTime), vus: curVus })
    }

    if (holdRateTime > 0) {
      curTime += holdRateTime
      pts.push({ time: Math.round(curTime), vus: targetConcurrency })
    }

    pts.push({ time: Math.round(curTime + 1), vus: 0 })
    return pts
  }, [targetConcurrency, rampUpTime, rampUpSteps, holdRateTime])

  return (
    <div className="editor-group-form">
      <Section title="Target Concurrency & Time Settings">
        <div className="form-grid-2">
          <FormField
            label="Target Concurrency (VUs)"
            type="number"
            min={1}
            value={Number(node.properties.targetConcurrency ?? 50)}
            onChange={(val) => updateProperties({ targetConcurrency: Number(val) })}
          />
          <SelectField
            label="Time Unit"
            value={String(node.properties.timeUnit ?? 'S')}
            options={[
              { value: 'S', label: 'Seconds (s)' },
              { value: 'M', label: 'Minutes (m)' },
            ]}
            onChange={(val) => updateProperties({ timeUnit: val })}
          />
        </div>

        <div className="form-grid-3" style={{ marginTop: 12 }}>
          <FormField
            label={`Ramp Up Time (${unitStr})`}
            type="number"
            min={0}
            value={Number(node.properties.rampUpTime ?? 60)}
            onChange={(val) => updateProperties({ rampUpTime: Number(val) })}
          />
          <FormField
            label="Ramp-Up Steps Count"
            type="number"
            min={1}
            value={Number(node.properties.rampUpSteps ?? 5)}
            onChange={(val) => updateProperties({ rampUpSteps: Number(val) })}
          />
          <FormField
            label={`Hold Target Rate Time (${unitStr})`}
            type="number"
            min={0}
            value={Number(node.properties.holdRateTime ?? 300)}
            onChange={(val) => updateProperties({ holdRateTime: Number(val) })}
          />
        </div>
      </Section>

      <Section title="Error & Iteration Handling">
        <div className="form-grid-2">
          <SelectField
            label="Action to be taken after a Sampler error"
            value={String(node.properties.onError ?? 'continue')}
            options={[
              { value: 'continue', label: 'Continue' },
              { value: 'startnextloop', label: 'Start Next Thread Loop' },
              { value: 'stopthread', label: 'Stop Thread' },
              { value: 'stoptest', label: 'Stop Test' },
              { value: 'stoptestnow', label: 'Stop Test Now' },
            ]}
            onChange={(val) => updateProperties({ onError: val })}
          />
          <FormField
            label="Iterations limit (Empty for unlimited)"
            placeholder="Unlimited"
            value={String(node.properties.iterations ?? '')}
            onChange={(val) => updateProperties({ iterations: val })}
          />
        </div>
      </Section>

      <WorkloadCurvePreview points={points} unit={unitStr} />
    </div>
  )
}

export function SteppingThreadGroupEditor({ node, updateProperties }: EditorProps) {
  const numThreads = Number(node.properties.numThreads ?? 100)
  const firstWait = Number(node.properties.firstWaitSeconds ?? 0)
  const initialThreads = Number(node.properties.initialThreads ?? 10)
  const thenAddThreads = Math.max(1, Number(node.properties.thenAddThreads ?? 10))
  const everySeconds = Math.max(1, Number(node.properties.everySeconds ?? 30))
  const rampUpSeconds = Number(node.properties.rampUpSeconds ?? 5)
  const holdSeconds = Number(node.properties.holdSeconds ?? 300)
  const thenStopThreads = Math.max(1, Number(node.properties.thenStopThreads ?? 10))
  const stopEverySeconds = Math.max(1, Number(node.properties.stopEverySeconds ?? 5))

  const points = useMemo(() => {
    const pts: { time: number; vus: number }[] = [{ time: 0, vus: 0 }]
    let curTime = 0
    let curVus = 0

    if (firstWait > 0) {
      curTime += firstWait
      pts.push({ time: curTime, vus: 0 })
    }

    if (initialThreads > 0) {
      curVus = Math.min(initialThreads, numThreads)
      pts.push({ time: curTime, vus: curVus })
    }

    while (curVus < numThreads) {
      curTime += rampUpSeconds
      curVus = Math.min(curVus + thenAddThreads, numThreads)
      pts.push({ time: curTime, vus: curVus })
      if (curVus < numThreads) {
        curTime += everySeconds
        pts.push({ time: curTime, vus: curVus })
      }
    }

    if (holdSeconds > 0) {
      curTime += holdSeconds
      pts.push({ time: curTime, vus: numThreads })
    }

    while (curVus > 0) {
      curTime += stopEverySeconds
      curVus = Math.max(0, curVus - thenStopThreads)
      pts.push({ time: curTime, vus: curVus })
    }

    return pts
  }, [numThreads, firstWait, initialThreads, thenAddThreads, everySeconds, rampUpSeconds, holdSeconds, thenStopThreads, stopEverySeconds])

  return (
    <div className="editor-group-form">
      <Section title="Thread Schedule Parameters">
        <div className="form-grid-2">
          <FormField
            label="Total Virtual Users (Threads)"
            type="number"
            min={1}
            value={Number(node.properties.numThreads ?? 100)}
            onChange={(val) => updateProperties({ numThreads: Number(val) })}
          />
          <FormField
            label="First wait before start (sec)"
            type="number"
            min={0}
            value={Number(node.properties.firstWaitSeconds ?? 0)}
            onChange={(val) => updateProperties({ firstWaitSeconds: Number(val) })}
          />
        </div>

        <div className="form-grid-3" style={{ marginTop: 12 }}>
          <FormField
            label="Start initial users"
            type="number"
            min={0}
            value={Number(node.properties.initialThreads ?? 10)}
            onChange={(val) => updateProperties({ initialThreads: Number(val) })}
          />
          <FormField
            label="Then add users count"
            type="number"
            min={1}
            value={Number(node.properties.thenAddThreads ?? 10)}
            onChange={(val) => updateProperties({ thenAddThreads: Number(val) })}
          />
          <FormField
            label="Every period (sec)"
            type="number"
            min={1}
            value={Number(node.properties.everySeconds ?? 30)}
            onChange={(val) => updateProperties({ everySeconds: Number(val) })}
          />
        </div>

        <div className="form-grid-3" style={{ marginTop: 12 }}>
          <FormField
            label="Ramp-up duration (sec)"
            type="number"
            min={0}
            value={Number(node.properties.rampUpSeconds ?? 5)}
            onChange={(val) => updateProperties({ rampUpSeconds: Number(val) })}
          />
          <FormField
            label="Flight / Hold duration (sec)"
            type="number"
            min={0}
            value={Number(node.properties.holdSeconds ?? 300)}
            onChange={(val) => updateProperties({ holdSeconds: Number(val) })}
          />
          <FormField
            label="Stop users count"
            type="number"
            min={1}
            value={Number(node.properties.thenStopThreads ?? 10)}
            onChange={(val) => updateProperties({ thenStopThreads: Number(val) })}
          />
        </div>
      </Section>

      <WorkloadCurvePreview points={points} unit="s" />
    </div>
  )
}

export function UltimateThreadGroupEditor({ node, updateProperties }: EditorProps) {
  const rawRows = (node.properties.scheduleRows as TableRow[]) || [
    { startThreads: '100', initialDelay: '0', startupTime: '30', holdLoadTime: '300', shutdownTime: '10' },
  ]

  const points = useMemo(() => {
    let maxT = 0
    rawRows.forEach((r) => {
      const delay = Number(r.initialDelay || 0)
      const ramp = Number(r.startupTime || 0)
      const hold = Number(r.holdLoadTime || 0)
      const shut = Number(r.shutdownTime || 0)
      maxT = Math.max(maxT, delay + ramp + hold + shut)
    })
    maxT = Math.max(maxT, 10)

    const step = maxT / 50
    const pts: { time: number; vus: number }[] = []

    for (let t = 0; t <= maxT; t += step) {
      let totalVus = 0
      rawRows.forEach((r) => {
        const vus = Number(r.startThreads || 0)
        const delay = Number(r.initialDelay || 0)
        const ramp = Number(r.startupTime || 0)
        const hold = Number(r.holdLoadTime || 0)
        const shut = Number(r.shutdownTime || 0)

        if (t < delay) {
          totalVus += 0
        } else if (t < delay + ramp) {
          const ratio = ramp > 0 ? (t - delay) / ramp : 1
          totalVus += Math.round(vus * ratio)
        } else if (t < delay + ramp + hold) {
          totalVus += vus
        } else if (t < delay + ramp + hold + shut) {
          const ratio = shut > 0 ? (delay + ramp + hold + shut - t) / shut : 0
          totalVus += Math.round(vus * ratio)
        }
      })
      pts.push({ time: Math.round(t), vus: totalVus })
    }

    return pts
  }, [rawRows])

  return (
    <div className="editor-group-form">
      <Section title="Threads Schedule Table">
        <EditableTable
          columns={[
            { key: 'startThreads', label: 'Start Threads', minWidth: 100 },
            { key: 'initialDelay', label: 'Initial Delay (s)', minWidth: 110 },
            { key: 'startupTime', label: 'Startup Time (s)', minWidth: 110 },
            { key: 'holdLoadTime', label: 'Hold Load (s)', minWidth: 110 },
            { key: 'shutdownTime', label: 'Shutdown (s)', minWidth: 100 },
          ]}
          rows={rawRows}
          newRow={{ startThreads: '100', initialDelay: '0', startupTime: '30', holdLoadTime: '300', shutdownTime: '10' }}
          onChange={(rows) => updateProperties({ scheduleRows: rows })}
        />
      </Section>

      <WorkloadCurvePreview points={points} unit="s" />
    </div>
  )
}
