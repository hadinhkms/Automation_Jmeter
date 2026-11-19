import { decodeUnicodeEscapes } from '../sampleHttpUtils'
import type { SampleDetails } from './useSampleDetails'
import type { DetailTabsState } from './useDetailTabs'
import { DetailTabsBar } from './DetailTabsBar'
import { RequestTab } from './RequestTab'
import { ResponseTab } from './ResponseTab'

interface DetailPaneProps {
  details: SampleDetails
  tabs: DetailTabsState
  copied: boolean
  onCopy: (text: string) => void
}

/** Right: JMeter Detail Tabs */
export function DetailPane({ details, tabs, copied, onCopy }: DetailPaneProps) {
  const { selectedSample, isSelectedHttpRequest, samplerResultText, requestHeaders, selectedHttpUrl } = details
  const { mainTab, activeRequestSubTab, responseSubTab, responseRenderer } = tabs

  // One copy button per view: code views use the editor's built-in button, the tab-bar "Copy" covers the rest
  const isCurlView = mainTab === 'request' && activeRequestSubTab === 'curl' && isSelectedHttpRequest
  const tabCopyText = (() => {
    if (mainTab === 'sampler-result') return samplerResultText
    if (mainTab === 'request') {
      if (activeRequestSubTab === 'headers') return requestHeaders
      if (activeRequestSubTab === 'url') return selectedHttpUrl
      if (activeRequestSubTab === 'raw') return decodeUnicodeEscapes(selectedSample?.request || selectedSample?.url || '')
      return null // cURL and Request Body render a CodeEditor with its own copy button
    }
    if (responseSubTab === 'headers') return details.formattedResponseHeaders
    if (responseSubTab === 'body' && responseRenderer !== 'json' && responseRenderer !== 'curl-response') return details.responseBody
    return null
  })()

  return (
        <div className="jmeter-vrt-detail-pane">
          {selectedSample ? (
            <>
              <DetailTabsBar
                mainTab={mainTab}
                setMainTab={tabs.setMainTab}
                showCurlShortcut={isSelectedHttpRequest && !isCurlView}
                onCopyCurl={() => onCopy(details.curlCommand)}
                tabCopyText={tabCopyText}
                onCopyTab={onCopy}
                copied={copied}
              />

              {/* Tab 1: Sampler Result */}
              {mainTab === 'sampler-result' ? (
                <div className="vrt-tab-content sampler-result-view">
                  <div className="sampler-result-box">
                    <pre className="jmeter-monospace-pre">{samplerResultText}</pre>
                  </div>
                </div>
              ) : null}

              {/* Tab 2: Request */}
              {mainTab === 'request' ? (
                <RequestTab selectedSample={selectedSample} details={details} tabs={tabs} />
              ) : null}

              {mainTab === 'response' ? (
                <ResponseTab selectedSample={selectedSample} details={details} tabs={tabs} />
              ) : null}
            </>
          ) : (
            <div className="vrt-no-selection">No sample selected.</div>
          )}
        </div>
  )
}
