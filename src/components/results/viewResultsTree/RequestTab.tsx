import { CodeEditor } from '../../common/CodeEditor'
import { decodeUnicodeEscapes } from '../sampleHttpUtils'
import type { SampleDetails } from './useSampleDetails'
import type { DetailTabsState } from './useDetailTabs'
import type { JtlSample } from '../../../services/jmeterRunnerService'
import { RequestSubtabsBar } from './RequestSubtabsBar'
import { UrlBreakdown } from './UrlBreakdown'

interface RequestTabProps {
  selectedSample: JtlSample
  details: SampleDetails
  tabs: DetailTabsState
}

/** Tab 2: Request */
export function RequestTab({ selectedSample, details, tabs }: RequestTabProps) {
  const { isSelectedHttpRequest, curlCommand, requestHeaders, urlInfo, requestBody, selectedHttpUrl } = details
  const { activeRequestSubTab, setRequestSubTab } = tabs
  const isScript =
    selectedSample.label.toLowerCase().includes('jsr223') || selectedSample.label.toLowerCase().includes('beanshell')
  return (
                <div className="vrt-tab-content request-view">
                  <RequestSubtabsBar
                    activeRequestSubTab={activeRequestSubTab}
                    setRequestSubTab={setRequestSubTab}
                    isSelectedHttpRequest={isSelectedHttpRequest}
                  />

                  <div className="request-subtab-content">
                    {activeRequestSubTab === 'curl' && isSelectedHttpRequest ? (
                      <div className="curl-view">
                        <CodeEditor
                          label={`cURL Â· ${selectedSample.label}`}
                          language="curl"
                          value={curlCommand}
                          minHeight={160}
                          readOnly
                          copyLabel="Copy cURL"
                          onChange={() => {}}
                        />
                      </div>
                    ) : activeRequestSubTab === 'headers' ? (
                      <div className="request-headers-wrap">
                        <pre className="jmeter-monospace-pre">{requestHeaders}</pre>
                      </div>
                    ) : activeRequestSubTab === 'url' && isSelectedHttpRequest && urlInfo ? (
                      <UrlBreakdown method={selectedSample.method} urlInfo={urlInfo} />
                    ) : activeRequestSubTab === 'body' ? (
                      <div className="request-body-wrap">
                        <CodeEditor
                          label={
                            isScript
                              ? `${selectedSample.label} - Groovy Script`
                              : isSelectedHttpRequest
                                ? 'Request Data'
                                : `${selectedSample.label} - Sampler Data`
                          }
                          language={
                            isScript
                              ? 'javascript'
                              : isSelectedHttpRequest && (selectedSample.request?.trim().startsWith('{') || selectedSample.request?.trim().startsWith('['))
                                ? 'json'
                                : 'text'
                          }
                          value={requestBody || (isSelectedHttpRequest ? selectedHttpUrl : '') || '(No request data)'}
                          minHeight={160}
                          readOnly
                          onChange={() => {}}
                        />
                      </div>
                    ) : (
                      <pre className="jmeter-monospace-pre">
                        {!isSelectedHttpRequest
                          ? `Sampler: ${selectedSample.label}\nThread: ${selectedSample.threadName || 'Thread Group 1-1'}\n\n${decodeUnicodeEscapes(selectedSample.request || '(No HTTP request data for this sampler)')}`
                          : `URL: ${selectedHttpUrl}\nThread: ${selectedSample.threadName}\n\n${decodeUnicodeEscapes(selectedSample.request || '')}`}
                      </pre>
                    )}
                  </div>
                </div>
  )
}
