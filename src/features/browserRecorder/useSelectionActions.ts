import { useState, type MouseEvent } from 'react'
import type { RecordedRequest } from '../../models/recorder'
import { areAllSelected, groupRequestsByRoute } from './recorderLogic'
import type { RecorderSessionModel } from './useRecorderSession'

/** Selection toggles and transaction (step) re-assignment for recorded requests. */
export function useSelectionActions(s: RecorderSessionModel, filteredRequests: RecordedRequest[]) {
  const [batchStepInput, setBatchStepInput] = useState('')

  // Auto-Group all requests by primary URL route
  const handleAutoGroupByRoute = () => {
    if (s.requests.length === 0) return
    s.setRequests(groupRequestsByRoute(s.requests))
    s.setErrorNotice(null)
  }

  // Apply new transaction step name to all selected requests
  const handleApplyBatchStep = () => {
    const trimmed = batchStepInput.trim()
    if (!trimmed || s.selectedReqIds.size === 0) return
    s.setRequests((prev) => prev.map((r) => (s.selectedReqIds.has(r.id) ? { ...r, transaction: trimmed } : r)))
    setBatchStepInput('')
  }

  // Toggle select all in filtered list
  const handleToggleSelectAll = () => {
    const allFilteredSelected = areAllSelected(filteredRequests, s.selectedReqIds)
    const next = new Set(s.selectedReqIds)
    if (allFilteredSelected) {
      for (const r of filteredRequests) next.delete(r.id)
    } else {
      for (const r of filteredRequests) next.add(r.id)
    }
    s.setSelectedReqIds(next)
  }

  // Toggle single request selection
  const handleToggleRequest = (id: string, e?: MouseEvent) => {
    if (e) e.stopPropagation()
    const next = new Set(s.selectedReqIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    s.setSelectedReqIds(next)
  }

  return {
    batchStepInput,
    setBatchStepInput,
    handleAutoGroupByRoute,
    handleApplyBatchStep,
    handleToggleSelectAll,
    handleToggleRequest,
  }
}
