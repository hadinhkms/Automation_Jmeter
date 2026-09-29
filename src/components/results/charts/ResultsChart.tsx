import { useEffect, useRef, useState } from 'react'
import {
  type ChartMetricPoint,
  DEFAULT_SERIES_CONFIG,
  type MetricSeriesKey,
  type SeriesConfig,
} from './chartTypes'
import { renderCanvasChart } from './chartRenderer'

interface ResultsChartProps {
  points: ChartMetricPoint[]
  height?: number
}

export function ResultsChart({ points, height = 320 }: ResultsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [series, setSeries] = useState<SeriesConfig[]>(DEFAULT_SERIES_CONFIG)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const toggleSeries = (key: MetricSeriesKey) => {
    setSeries((prev) =>
      prev.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s)),
    )
  }

  // Draw chart on updates & resize
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    const width = rect.width || 600

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.scale(dpr, dpr)
    renderCanvasChart({
      ctx,
      width,
      height,
      points,
      series,
      hoverIndex,
    })
    ctx.restore()
  }, [points, series, hoverIndex, height])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || points.length < 2) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const paddingLeft = 55
    const paddingRight = 30
    const chartW = rect.width - paddingLeft - paddingRight

    if (x < paddingLeft || x > rect.width - paddingRight) {
      setHoverIndex(null)
      return
    }

    const ratio = (x - paddingLeft) / chartW
    const idx = Math.round(ratio * (points.length - 1))
    setHoverIndex(Math.max(0, Math.min(points.length - 1, idx)))
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: 'var(--panel-bg-subtle, rgba(15, 23, 42, 0.6))',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: 8,
        overflow: 'hidden',
        padding: 12,
      }}
    >
      {/* Series Toggle Chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 10,
          paddingLeft: 8,
        }}
      >
        {series.map((s) => (
          <button
            key={s.key}
            onClick={() => toggleSeries(s.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              padding: '4px 10px',
              borderRadius: 14,
              border: `1px solid ${s.visible ? s.color : 'var(--border-color, #475569)'}`,
              background: s.visible ? `${s.color}22` : 'transparent',
              color: s.visible ? s.color : 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: s.visible ? s.color : '#64748b',
              }}
            />
            {s.label}
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
        style={{ display: 'block', cursor: 'crosshair' }}
      />
    </div>
  )
}
