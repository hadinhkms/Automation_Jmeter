import { useEffect, useState } from 'react'
import type { BrowserDetection, RecordedRequest } from '../../models/recorder'
import { browserRecorderService, type RecorderStatus } from '../../services/browserRecorderService'
import type { BrowserChoice } from './recorderTypes'
import { useRecorderStream } from './useRecorderStream'

/** Core recorder session state: browser config, captured requests, selection, status. */
export function useRecorderSession(isOpen: boolean) {
  const [availableBrowsers, setAvailableBrowsers] = useState<BrowserDetection>({ available: [] })
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserChoice>('chrome')
  const [targetUrl, setTargetUrl] = useState('https://')
  const [currentTransaction, setCurrentTransaction] = useState('01_Open_Application')
  const [nextTransactionInput, setNextTransactionInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [requests, setRequests] = useState<RecordedRequest[]>([])
  const [selectedReqIds, setSelectedReqIds] = useState<Set<string>>(new Set())
  const [inspectedReqId, setInspectedReqId] = useState<string | null>(null)
  const [autoPageSplit, setAutoPageSplit] = useState(true)
  const [harFileName, setHarFileName] = useState<string | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  // Fetch available browsers and status on modal open
  useEffect(() => {
    if (!isOpen) return

    browserRecorderService.getAvailableBrowsers()
      .then((res) => {
        setAvailableBrowsers(res)
        if (res.chrome) setSelectedBrowser('chrome')
        else if (res.edge) setSelectedBrowser('edge')
        else if (res.available.length > 0) setSelectedBrowser(res.available[0].type)
      })
      .catch(() => {})

    browserRecorderService.getStatus()
      .then((st: RecorderStatus) => {
        setIsRecording(st.isRecording)
        if (st.currentTransaction) setCurrentTransaction(st.currentTransaction)
        if (st.requests && st.requests.length > 0) {
          setRequests(st.requests)
          setSelectedReqIds(new Set(st.requests.map((r) => r.id)))
        }
      })
      .catch(() => {})
  }, [isOpen])

  // Listen to live stream events
  useRecorderStream(isOpen, isRecording, {
    setIsRecording,
    setCurrentTransaction,
    setRequests,
    setSelectedReqIds,
    setInspectedReqId,
    setIsStarting,
    setErrorNotice,
  })

  return {
    availableBrowsers,
    selectedBrowser,
    setSelectedBrowser,
    targetUrl,
    setTargetUrl,
    currentTransaction,
    setCurrentTransaction,
    nextTransactionInput,
    setNextTransactionInput,
    isRecording,
    setIsRecording,
    requests,
    setRequests,
    selectedReqIds,
    setSelectedReqIds,
    inspectedReqId,
    setInspectedReqId,
    autoPageSplit,
    setAutoPageSplit,
    harFileName,
    setHarFileName,
    errorNotice,
    setErrorNotice,
    isStarting,
    setIsStarting,
  }
}

export type RecorderSessionModel = ReturnType<typeof useRecorderSession>
