import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { RecordedRequest } from '../../models/recorder'
import { browserRecorderService } from '../../services/browserRecorderService'

type Setter<T> = Dispatch<SetStateAction<T>>

export interface RecorderStreamSetters {
  setIsRecording: Setter<boolean>
  setCurrentTransaction: Setter<string>
  setRequests: Setter<RecordedRequest[]>
  setSelectedReqIds: Setter<Set<string>>
  setInspectedReqId: Setter<string | null>
  setIsStarting: Setter<boolean>
  setErrorNotice: Setter<string | null>
}

/** Subscribes to the live recorder SSE stream while the modal is open. */
export function useRecorderStream(isOpen: boolean, isRecording: boolean, s: RecorderStreamSetters) {
  const streamUnsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!isOpen) {
      if (streamUnsubRef.current) {
        streamUnsubRef.current()
        streamUnsubRef.current = null
      }
      return
    }

    const unsub = browserRecorderService.connectStream({
      onConnected: (data) => {
        s.setIsRecording(data.status.isRecording)
        if (data.status.currentTransaction) s.setCurrentTransaction(data.status.currentTransaction)
        if (data.status.requests) {
          s.setRequests(data.status.requests)
          s.setSelectedReqIds(new Set(data.status.requests.map((r) => r.id)))
        }
      },
      onStarted: (data) => {
        s.setIsRecording(true)
        if (data.transaction) s.setCurrentTransaction(data.transaction)
        s.setIsStarting(false)
        s.setErrorNotice(null)
      },
      onStopped: () => {
        s.setIsRecording(false)
        s.setIsStarting(false)
      },
      onRequestAdded: (req) => {
        s.setRequests((prev) => [...prev, req])
        s.setSelectedReqIds((prev) => new Set([...prev, req.id]))
      },
      onRequestUpdated: (updated) => {
        s.setRequests((prev) =>
          prev.map((r) => (r.id === updated.id || r.requestId === updated.requestId ? { ...r, ...updated } : r))
        )
      },
      onTransactionChanged: (data) => {
        s.setCurrentTransaction(data.transaction)
      },
      onCleared: () => {
        s.setRequests([])
        s.setSelectedReqIds(new Set())
        s.setInspectedReqId(null)
      },
      onError: (err) => {
        if (isRecording) {
          s.setErrorNotice(err)
        }
      },
    })

    streamUnsubRef.current = unsub

    return () => {
      unsub()
      streamUnsubRef.current = null
    }
    // Setters are stable useState dispatchers; deps intentionally match the original effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isRecording])
}
