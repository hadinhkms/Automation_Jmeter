// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { useMemo } from 'react'
import { X, Activity, Clock, Users, Zap } from 'lucide-react'
import type { TestPlanNode } from '../../models/jmeter'
import { WorkloadCurvePreview } from '../../editors/ThreadEditors'

interface WorkloadGraphModalProps {
  isOpen: boolean
  onClose: () => void
  testPlan: TestPlanNode
}

function extractThreadGroupCurves(node: TestPlanNode): Array<{ name: string; type: string; points: { time: number; vus: number }[] }> {
  const curves: Array<{ name: string; type: string; points: { time: number; vus: number }[] }> = []

  function traverse(n: TestPlanNode) {
    if (!n.enabled) return

    if (n.type === 'ThreadGroup') {
      const threads = Number(n.properties.threads ?? 1)
      const rampUp = Number(n.properties.rampUp ?? 1)
      const duration = Number(n.properties.duration ?? 0)
      const loops = Number(n.properties.loops ?? 1)
      const totalTime = duration > 0 ? duration : rampUp + loops * 5

      const pts: { time: number; vus: number }[] = [
        { time: 0, vus: 0 },
        { time: Math.max(1, rampUp), vus: threads },
        { time: Math.max(rampUp + 1, totalTime), vus: threads },
        { time: totalTime + 1, vus: 0 },
      ]
      curves.push({ name: n.name, type: 'Standard ThreadGroup', points: pts })
    } else if (n.type === 'ConcurrencyThreadGroup') {
      const target = Number(n.properties.targetConcurrency ?? 50)
      const ramp = Number(n.properties.rampUpTime ?? 60)
      const steps = Math.max(1, Number(n.properties.rampUpSteps ?? 5))
      const hold = Number(n.properties.holdRateTime ?? 300)
      const pts: { time: number; vus: number }[] = [{ time: 0, vus: 0 }]
      const stepDur = ramp / steps
      const stepVus = target / steps

      let curT = 0
      for (let s = 1; s <= steps; s++) {
        curT += stepDur
        pts.push({ time: Math.round(curT), vus: Math.round(s * stepVus) })
      }
      if (hold > 0) {
        curT += hold
        pts.push({ time: Math.round(curT), vus: target })
      }
      pts.push({ time: Math.round(curT + 1), vus: 0 })
      curves.push({ name: n.name, type: 'ConcurrencyThreadGroup', points: pts })
    } else if (n.type === 'SteppingThreadGroup') {
      const numThreads = Number(n.properties.numThreads ?? 100)
      const firstWait = Number(n.properties.firstWaitSeconds ?? 0)
      const initialThreads = Number(n.properties.initialThreads ?? 10)
      const thenAddThreads = Math.max(1, Number(n.properties.thenAddThreads ?? 10))
      const everySeconds = Math.max(1, Number(n.properties.everySeconds ?? 30))
      const rampUpSeconds = Number(n.properties.rampUpSeconds ?? 5)
      const holdSeconds = Number(n.properties.holdSeconds ?? 300)
      const thenStopThreads = Math.max(1, Number(n.properties.thenStopThreads ?? 10))
      const stopEverySeconds = Math.max(1, Number(n.properties.stopEverySeconds ?? 5))

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
      curves.push({ name: n.name, type: 'SteppingThreadGroup', points: pts })
    } else if (n.type === 'UltimateThreadGroup') {
      const rows = (n.properties.scheduleRows as Array<Record<string, string>>) || []
      let maxT = 0
      rows.forEach((r) => {
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
        rows.forEach((r) => {
          const vus = Number(r.startThreads || 0)
          const delay = Number(r.initialDelay || 0)
          const ramp = Number(r.startupTime || 0)
          const hold = Number(r.holdLoadTime || 0)
          const shut = Number(r.shutdownTime || 0)
          if (t >= delay && t < delay + ramp) {
            totalVus += Math.round(vus * ((t - delay) / (ramp || 1)))
          } else if (t >= delay + ramp && t < delay + ramp + hold) {
            totalVus += vus
          } else if (t >= delay + ramp + hold && t < delay + ramp + hold + shut) {
            totalVus += Math.round(vus * ((delay + ramp + hold + shut - t) / (shut || 1)))
          }
        })
        pts.push({ time: Math.round(t), vus: totalVus })
      }
      curves.push({ name: n.name, type: 'UltimateThreadGroup', points: pts })
    }

    n.children.forEach(traverse)
  }

  traverse(node)
  return curves
}

export function WorkloadGraphModal({ isOpen, onClose, testPlan }: WorkloadGraphModalProps) {
  if (!isOpen) return null

  const curves = useMemo(() => extractThreadGroupCurves(testPlan), [testPlan])

  // Aggregate composite curve
  const compositeCurve = useMemo(() => {
    if (curves.length === 0) return [{ time: 0, vus: 0 }]
    let maxTime = 0
    curves.forEach((c) => {
      const lastT = Math.max(...c.points.map((p) => p.time), 0)
      maxTime = Math.max(maxTime, lastT)
    })
    maxTime = Math.max(maxTime, 10)

    const step = Math.max(1, Math.round(maxTime / 60))
    const points: { time: number; vus: number }[] = []

    for (let t = 0; t <= maxTime; t += step) {
      let totalVus = 0
      curves.forEach((c) => {
        // interpolate VUs at time t for this curve
        for (let i = 0; i < c.points.length - 1; i++) {
          const p1 = c.points[i]
          const p2 = c.points[i + 1]
          if (t >= p1.time && t <= p2.time) {
            const span = p2.time - p1.time
            const ratio = span > 0 ? (t - p1.time) / span : 0
            totalVus += Math.round(p1.vus + (p2.vus - p1.vus) * ratio)
            break
          }
        }
      })
      points.push({ time: t, vus: totalVus })
    }
    return points
  }, [curves])

  const maxTotalVus = Math.max(...compositeCurve.map((p) => p.vus), 0)
  const totalDuration = Math.max(...compositeCurve.map((p) => p.time), 0)

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 880, width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} color="#3b82f6" />
            <h3>Workload Curve & Concurrency Profile</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                <Users size={14} /> Peak Concurrency
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1d4ed8', marginTop: 4 }}>
                {maxTotalVus} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>VUs</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                <Clock size={14} /> Total Duration
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#059669', marginTop: 4 }}>
                {totalDuration} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>sec</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                <Zap size={14} /> Active Thread Groups
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706', marginTop: 4 }}>
                {curves.length} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>Groups</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Combined System Workload Curve</h4>
            <WorkloadCurvePreview points={compositeCurve} unit="s" height={220} />
          </div>

          {curves.length > 1 && (
            <div>
              <h4 style={{ margin: '18px 0 10px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Individual Thread Group Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {curves.map((c, i) => (
                  <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      <span>{c.name}</span>
                      <span style={{ fontSize: 11, color: '#334155', background: '#e2e8f0', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                        {c.type}
                      </span>
                    </div>
                    <WorkloadCurvePreview points={c.points} unit="s" height={130} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
