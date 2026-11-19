import { useState, useRef, useEffect, useCallback } from 'react'

/** Scroll/resize tracking for the virtualised read-only code view. */
export function useVirtualViewport(isVirtualReadOnlyMode: boolean, minHeight: number) {
  const virtualScrollerRef = useRef<HTMLDivElement>(null)
  const virtualScrollRafRef = useRef<number | null>(null)
  const [virtualViewport, setVirtualViewport] = useState({ scrollTop: 0, clientHeight: minHeight })

  const handleVirtualScroll = useCallback(() => {
    if (!virtualScrollerRef.current || virtualScrollRafRef.current !== null) return

    virtualScrollRafRef.current = window.requestAnimationFrame(() => {
      virtualScrollRafRef.current = null
      const scroller = virtualScrollerRef.current
      if (!scroller) return

      setVirtualViewport((previous) => {
        if (previous.scrollTop === scroller.scrollTop && previous.clientHeight === scroller.clientHeight) {
          return previous
        }
        return { scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight }
      })
    })
  }, [])

  useEffect(() => {
    return () => {
      if (virtualScrollRafRef.current !== null) {
        window.cancelAnimationFrame(virtualScrollRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isVirtualReadOnlyMode || !virtualScrollerRef.current) return

    const scroller = virtualScrollerRef.current
    setVirtualViewport({ scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight })

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      setVirtualViewport({ scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight })
    })
    observer.observe(scroller)

    return () => observer.disconnect()
  }, [isVirtualReadOnlyMode])

  return { virtualViewport, virtualScrollerRef, handleVirtualScroll }
}
