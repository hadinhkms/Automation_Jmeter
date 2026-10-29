import type { CurvePoint, ThreadGroupCurve } from './types'

export function computeCompositeCurve(curves: ThreadGroupCurve[]): CurvePoint[] {
  if (curves.length === 0) return [{ time: 0, vus: 0 }]
  const maxTime = Math.max(...curves.flatMap((c) => c.points.map((p) => p.time)), 10)
  const step = Math.max(1, Math.round(maxTime / 60))
  const points: CurvePoint[] = []
  for (let t = 0; t <= maxTime; t += step) {
    let totalVus = 0
    curves.forEach((c) => {
      for (let i = 0; i < c.points.length - 1; i++) {
        const p1 = c.points[i]
        const p2 = c.points[i + 1]
        if (t >= p1.time && t <= p2.time) {
          const span = p2.time - p1.time
          totalVus += Math.round(p1.vus + (p2.vus - p1.vus) * (span > 0 ? (t - p1.time) / span : 0))
          break
        }
      }
    })
    points.push({ time: t, vus: totalVus })
  }
  return points
}
