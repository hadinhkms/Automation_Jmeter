import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { JtlSample } from '../../../services/jmeterRunnerService'

/** Auto-selects the first sample, highlights newly arrived samples and auto-scrolls to them. */
export function useSampleTracking(
  samples: JtlSample[],
  selectedId: string,
  setSelectedId: (id: string) => void,
  autoScroll: boolean,
  sampleListRef: RefObject<HTMLDivElement>
): Set<string> {
  const [newSampleIds, setNewSampleIds] = useState<Set<string>>(new Set())
  const lastSampleCountRef = useRef(samples.length)
  const newSampleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Auto-select first sample when samples change
  useEffect(() => {
    if (samples.length > 0 && (!selectedId || !samples.some((s) => s.id === selectedId))) {
      setSelectedId(samples[0].id)
    }
  }, [samples, selectedId])

  // Track new samples and auto-scroll when they arrive
  useEffect(() => {
    const newCount = samples.length
    const oldCount = lastSampleCountRef.current

    if (newCount > oldCount) {
      const newSamples = samples.slice(oldCount)
      const newIds = new Set(newSamples.map((s) => s.id))
      newIds.forEach((id) => {
        if (newSampleTimersRef.current.has(id)) {
          clearTimeout(newSampleTimersRef.current.get(id)!)
        }
        const timer = setTimeout(() => {
          setNewSampleIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          newSampleTimersRef.current.delete(id)
        }, 3000)
        newSampleTimersRef.current.set(id, timer)
      })

      setNewSampleIds((prev) => new Set([...prev, ...newIds]))

      if (autoScroll) {
        const lastId = newSamples[newSamples.length - 1]?.id
        if (lastId) {
          setSelectedId(lastId)
        }
      }

      setTimeout(() => {
        if (sampleListRef.current && autoScroll) {
          sampleListRef.current.scrollTop = sampleListRef.current.scrollHeight
        }
      }, 50)
    } else if (newCount < oldCount) {
      newSampleTimersRef.current.forEach((timer) => clearTimeout(timer))
      newSampleTimersRef.current.clear()
      setNewSampleIds(new Set())
    }

    lastSampleCountRef.current = newCount
  }, [samples, autoScroll])

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = newSampleTimersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  return newSampleIds
}
