import type { JtlSample } from '../../../services/jmeterRunnerService'
import type { SampleDetails } from './useSampleDetails'
import type { DetailTabsState } from './useDetailTabs'
import { ResponseHeaderBar } from './ResponseHeaderBar'
import { ResponseBodyView } from './ResponseBodyView'
import { ResponseCookiesView, ResponseHeadersTable, ResponseTestResults } from './ResponseInfoViews'
import { downloadResponse } from './downloadResponse'

interface ResponseTabProps {
  selectedSample: JtlSample
  details: SampleDetails
  tabs: DetailTabsState
}

/** Tab 3: Response data */
export function ResponseTab({ selectedSample, details, tabs }: ResponseTabProps) {
  const { responseSubTab, setResponseSubTab } = tabs
  const { cookiesList, responseHeadersList, responseBody } = details
  return (
                <div className="vrt-tab-content response-view">
                  <ResponseHeaderBar
                    selectedSample={selectedSample}
                    responseSubTab={responseSubTab}
                    setResponseSubTab={setResponseSubTab}
                    cookiesCount={cookiesList.length}
                    headersCount={responseHeadersList.length}
                    onDownload={() => downloadResponse(selectedSample, responseBody)}
                  />

                  {responseSubTab === 'body' ? (
                    <ResponseBodyView selectedSample={selectedSample} details={details} tabs={tabs} />
                  ) : responseSubTab === 'headers' ? (
                    <ResponseHeadersTable headers={responseHeadersList} />
                  ) : responseSubTab === 'cookies' ? (
                    <ResponseCookiesView cookies={cookiesList} />
                  ) : (
                    <ResponseTestResults selectedSample={selectedSample} />
                  )}
                </div>
  )
}
