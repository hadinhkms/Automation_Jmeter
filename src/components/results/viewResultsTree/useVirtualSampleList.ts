import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { JtlSample } from '../../../services/jmeterRunnerService'
import { SAMPLE_OVERSCAN_ROWS, SAMPLE_ROW_HEIGHT } from './types'

/** Windowed rendering of the sample list plus keeping the selected row in view. */
export function useVirtualSampleList(
  filteredSamples: JtlSample[],
  selectedSample: JtlSample | undefined,
  autoScroll: boolean,
  sampleListRef: RefObject<HTMLDivElement>
) {
  const sampleScrollRafRef = useRef<number | null>(null)
  const [sampleViewport, setSampleViewport] = useState({ scrollTop: 0, clientHeight: 420 })

  const virtualSampleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(sampleViewport.scrollTop / SAMPLE_ROW_HEIGHT) - SAMPLE_OVERSCAN_ROWS)
    const visibleCount = Math.ceil(sampleViewport.clientHeight / SAMPLE_ROW_HEIGHT) + SAMPLE_OVERSCAN_ROWS * 2
    const end = Math.min(filteredSamples.length, start + visibleCount)

    return {
      start,
      end,
      offsetTop: start * SAMPLE_ROW_HEIGHT,
      totalHeight: filteredSamples.length * SAMPLE_ROW_HEIGHT,
    }
  }, [filteredSamples.length, sampleViewport])

  const visibleSamples = useMemo(() => {
    return filteredSamples.slice(virtualSampleRange.start, virtualSampleRange.end)
  }, [filteredSamples, virtualSampleRange])

  const handleSampleListScroll = useCallback(() => {
    if (!sampleListRef.current || sampleScrollRafRef.current !== null) return

    sampleScrollRafRef.current = window.requestAnimationFrame(() => {
      sampleScrollRafRef.current = null
      const scroller = sampleListRef.current
      if (!scroller) return

      setSampleViewport((previous) => {
        if (previous.scrollTop === scroller.scrollTop && previous.clientHeight === scroller.clientHeight) {
          return previous
        }
        return { scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight }
      })
    })
  }, [])

  useEffect(() => {
    return () => {
      if (sampleScrollRafRef.current !== null) {
        window.cancelAnimationFrame(sampleScrollRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!sampleListRef.current) return
    const scroller = sampleListRef.current
    setSampleViewport({ scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight || 420 })

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      setSampleViewport({ scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight || 420 })
    })
    observer.observe(scroller)

    return () => observer.disconnect()
  }, [])

  // Scroll active item into view without requiring every sample row to be mounted.
  useEffect(() => {
    if (!autoScroll || !sampleListRef.current || !selectedSample) return

    const selectedIndex = filteredSamples.findIndex((sample) => sample.id === selectedSample.id)
    if (selectedIndex < 0) return

    const scroller = sampleListRef.current
    const top = selectedIndex * SAMPLE_ROW_HEIGHT
    const bottom = top + SAMPLE_ROW_HEIGHT
    const viewTop = scroller.scrollTop
    const viewBottom = viewTop + scroller.clientHeight

    if (top < viewTop) {
      scroller.scrollTo({ top, behavior: 'smooth' })
    } else if (bottom > viewBottom) {
      scroller.scrollTo({ top: bottom - scroller.clientHeight, behavior: 'smooth' })
    }
  }, [selectedSample, filteredSamples, autoScroll])

  return { virtualSampleRange, visibleSamples, handleSampleListScroll }
}
