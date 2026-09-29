import type { ChartMetricPoint, SeriesConfig } from './chartTypes'

export interface RenderOptions {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  points: ChartMetricPoint[]
  series: SeriesConfig[]
  hoverIndex: number | null
}

export function renderCanvasChart({ ctx, width, height, points, series, hoverIndex }: RenderOptions) {
  ctx.clearRect(0, 0, width, height)
  if (points.length < 2) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Collecting metrics stream... Chart will appear momentarily.', width / 2, height / 2)
    return
  }

  const padding = { top: 20, right: 30, bottom: 30, left: 55 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  // Draw background grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
  }
  ctx.stroke()

  const activeSeries = series.filter((s) => s.visible)
  if (activeSeries.length === 0) return

  // Find max value across active series to scale Y
  let maxY = 1
  for (const s of activeSeries) {
    for (const p of points) {
      const val = Number(p[s.key]) || 0
      if (val > maxY) maxY = val
    }
  }
  maxY = Math.ceil(maxY * 1.15) || 10

  // Draw Y-axis labels
  ctx.fillStyle = '#94a3b8'
  ctx.font = '11px monospace'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const val = Math.round((maxY / 4) * (4 - i))
    const y = padding.top + (chartH / 4) * i + 4
    ctx.fillText(String(val), padding.left - 8, y)
  }

  // Draw each series line and area
  activeSeries.forEach((s) => {
    ctx.beginPath()
    const stepX = chartW / (points.length - 1)

    points.forEach((p, idx) => {
      const x = padding.left + idx * stepX
      const val = Number(p[s.key]) || 0
      const y = padding.top + chartH - (val / maxY) * chartH
      if (idx === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })

    // Stroke curve
    ctx.strokeStyle = s.color
    ctx.lineWidth = 2
    ctx.stroke()

    // Subtle area fill
    ctx.lineTo(padding.left + chartW, padding.top + chartH)
    ctx.lineTo(padding.left, padding.top + chartH)
    ctx.closePath()
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH)
    gradient.addColorStop(0, `${s.color}33`)
    gradient.addColorStop(1, `${s.color}00`)
    ctx.fillStyle = gradient
    ctx.fill()
  })

  // Draw hover crosshair and point tooltips
  if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length) {
    const stepX = chartW / (points.length - 1)
    const hx = padding.left + hoverIndex * stepX

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(hx, padding.top)
    ctx.lineTo(hx, padding.top + chartH)
    ctx.stroke()
    ctx.setLineDash([])

    const pt = points[hoverIndex]
    // Draw dots on curves
    activeSeries.forEach((s) => {
      const val = Number(pt[s.key]) || 0
      const hy = padding.top + chartH - (val / maxY) * chartH
      ctx.fillStyle = s.color
      ctx.beginPath()
      ctx.arc(hx, hy, 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // Floating tooltip card
    const tooltipX = hx > width / 2 ? hx - 170 : hx + 15
    const tooltipY = padding.top + 10
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(tooltipX, tooltipY, 155, 20 + activeSeries.length * 18, 6)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    const timeStr = new Date(pt.timestamp).toLocaleTimeString()
    ctx.fillText(`Time: ${timeStr}`, tooltipX + 8, tooltipY + 14)

    activeSeries.forEach((s, idx) => {
      const val = Number(pt[s.key]) || 0
      ctx.fillStyle = s.color
      ctx.font = '11px sans-serif'
      ctx.fillText(`${s.label}: ${val.toFixed(1)} ${s.unit}`, tooltipX + 8, tooltipY + 32 + idx * 18)
    })
  }
}
