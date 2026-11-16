import { useMemo, useState } from 'react'
import type { RecordedRequest } from '../../models/recorder'
import { filterRequests } from './recorderLogic'
import type { TypeFilter } from './recorderTypes'

/** Request list filters plus derived filtered / inspected / selected-count values. */
export function useRecorderFilters(
  requests: RecordedRequest[],
  selectedReqIds: Set<string>,
  inspectedReqId: string | null
) {
  const [searchText, setSearchText] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [hideStatic, setHideStatic] = useState(true)
  const [hideAnalytics, setHideAnalytics] = useState(true)

  const filteredRequests = useMemo(
    () => filterRequests(requests, { searchText, methodFilter, typeFilter, hideStatic, hideAnalytics }),
    [requests, hideStatic, hideAnalytics, methodFilter, typeFilter, searchText]
  )

  // Active inspected request
  const inspectedReq = useMemo(() => {
    if (!inspectedReqId) return filteredRequests[0] || null
    return requests.find((r) => r.id === inspectedReqId) || filteredRequests[0] || null
  }, [requests, filteredRequests, inspectedReqId])

  // Total selected count among filtered
  const selectedCount = useMemo(() => {
    let count = 0
    for (const r of filteredRequests) {
      if (selectedReqIds.has(r.id)) count++
    }
    return count
  }, [filteredRequests, selectedReqIds])

  return {
    searchText,
    setSearchText,
    methodFilter,
    setMethodFilter,
    typeFilter,
    setTypeFilter,
    hideStatic,
    setHideStatic,
    hideAnalytics,
    setHideAnalytics,
    filteredRequests,
    inspectedReq,
    selectedCount,
  }
}
