import { useMemo } from 'react'
import { BarChart2 } from 'lucide-react'

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
