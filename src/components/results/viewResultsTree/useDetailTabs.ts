import { useEffect, useState } from 'react'
import type { MainTab, RequestSubTab, ResponseRenderer, ResponseSubTab } from './types'

/** Tab / sub-tab / renderer selection of the detail pane (kept in the root so it survives view-mode switches). */
export function useDetailTabs(isSelectedHttpRequest: boolean) {
  const [mainTab, setMainTab] = useState<MainTab>('sampler-result')
  const [requestSubTab, setRequestSubTab] = useState<RequestSubTab>('curl')
  const [responseSubTab, setResponseSubTab] = useState<ResponseSubTab>('body')
  const [responseRenderer, setResponseRenderer] = useState<ResponseRenderer>('json')
  const [responseSearchQuery, setResponseSearchQuery] = useState('')

  const activeRequestSubTab = isSelectedHttpRequest
    ? requestSubTab
    : requestSubTab === 'body'
      ? 'body'
      : 'raw'

  useEffect(() => {
    if (isSelectedHttpRequest) return
    if (requestSubTab === 'curl' || requestSubTab === 'headers' || requestSubTab === 'url') {
      setRequestSubTab('raw')
    }
    if (responseRenderer === 'curl-response') {
      setResponseRenderer('json')
    }
  }, [isSelectedHttpRequest, requestSubTab, responseRenderer])

  return {
    mainTab,
    setMainTab,
    activeRequestSubTab,
    setRequestSubTab,
    responseSubTab,
    setResponseSubTab,
    responseRenderer,
    setResponseRenderer,
    responseSearchQuery,
    setResponseSearchQuery,
  }
}

export type DetailTabsState = ReturnType<typeof useDetailTabs>
