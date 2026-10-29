import type { TestPlanNode } from '../../models/jmeter'
import type { CurvePoint, ThreadGroupCurve } from './types'

export function parseStandardThreadGroup(n: TestPlanNode): ThreadGroupCurve {
  const threads = Number(n.properties.threads ?? 1)
  const rampUp = Number(n.properties.rampUp ?? 1)
  const duration = Number(n.properties.duration ?? 0)
  const loops = Number(n.properties.loops ?? 1)
  const totalTime = duration > 0 ? duration : rampUp + loops * 5
  return {
    name: n.name,
    type: 'Standard ThreadGroup',
    points: [
      { time: 0, vus: 0 },
      { time: Math.max(1, rampUp), vus: threads },
      { time: Math.max(rampUp + 1, totalTime), vus: threads },
      { time: totalTime + 1, vus: 0 },
    ],
  }
}

export function parseConcurrencyThreadGroup(n: TestPlanNode): ThreadGroupCurve {
  const target = Number(n.properties.targetConcurrency ?? 50)
  const ramp = Number(n.properties.rampUpTime ?? 60)
  const steps = Math.max(1, Number(n.properties.rampUpSteps ?? 5))
  const hold = Number(n.properties.holdRateTime ?? 300)
  const pts: CurvePoint[] = [{ time: 0, vus: 0 }]
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
  return { name: n.name, type: 'ConcurrencyThreadGroup', points: pts }
}

export function parseSteppingThreadGroup(n: TestPlanNode): ThreadGroupCurve {
  const numThreads = Number(n.properties.numThreads ?? 100)
  const firstWait = Number(n.properties.firstWaitSeconds ?? 0)
  const initialThreads = Number(n.properties.initialThreads ?? 10)
  const thenAdd = Math.max(1, Number(n.properties.thenAddThreads ?? 10))
  const everySec = Math.max(1, Number(n.properties.everySeconds ?? 30))
  const rampSec = Number(n.properties.rampUpSeconds ?? 5)
  const holdSec = Number(n.properties.holdSeconds ?? 300)
  const thenStop = Math.max(1, Number(n.properties.thenStopThreads ?? 10))
  const stopEvery = Math.max(1, Number(n.properties.stopEverySeconds ?? 5))
  const pts: CurvePoint[] = [{ time: 0, vus: 0 }]
  let curT = 0
  let curVus = 0
  if (firstWait > 0) pts.push({ time: (curT += firstWait), vus: 0 })
  if (initialThreads > 0) pts.push({ time: curT, vus: (curVus = Math.min(initialThreads, numThreads)) })
  while (curVus < numThreads) {
    curT += rampSec
    pts.push({ time: curT, vus: (curVus = Math.min(curVus + thenAdd, numThreads)) })
    if (curVus < numThreads) pts.push({ time: (curT += everySec), vus: curVus })
  }
  if (holdSec > 0) pts.push({ time: (curT += holdSec), vus: numThreads })
  while (curVus > 0) {
    curT += stopEvery
    pts.push({ time: curT, vus: (curVus = Math.max(0, curVus - thenStop)) })
  }
  return { name: n.name, type: 'SteppingThreadGroup', points: pts }
}

export function parseUltimateThreadGroup(n: TestPlanNode): ThreadGroupCurve {
  const rows = (n.properties.scheduleRows as Array<Record<string, string>>) || []
  let maxT = 10
  rows.forEach((r) => {
    const span = Number(r.initialDelay || 0) + Number(r.startupTime || 0) + Number(r.holdLoadTime || 0) + Number(r.shutdownTime || 0)
    maxT = Math.max(maxT, span)
  })
  const step = maxT / 50
  const pts: CurvePoint[] = []
  for (let t = 0; t <= maxT; t += step) {
    let totalVus = 0
    rows.forEach((r) => {
      const vus = Number(r.startThreads || 0)
      const d = Number(r.initialDelay || 0)
      const ramp = Number(r.startupTime || 0)
      const hold = Number(r.holdLoadTime || 0)
      const shut = Number(r.shutdownTime || 0)
      if (t >= d && t < d + ramp) totalVus += Math.round(vus * ((t - d) / (ramp || 1)))
      else if (t >= d + ramp && t < d + ramp + hold) totalVus += vus
      else if (t >= d + ramp + hold && t < d + ramp + hold + shut) {
        totalVus += Math.round(vus * ((d + ramp + hold + shut - t) / (shut || 1)))
      }
    })
    pts.push({ time: Math.round(t), vus: totalVus })
  }
  return { name: n.name, type: 'UltimateThreadGroup', points: pts }
}
