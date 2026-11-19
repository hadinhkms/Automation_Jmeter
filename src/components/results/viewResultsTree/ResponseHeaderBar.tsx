import { Clock, Download, HardDrive } from 'lucide-react'
import type { JtlSample } from '../../../services/jmeterRunnerService'
import type { ResponseSubTab } from './types'

interface ResponseHeaderBarProps {
  selectedSample: JtlSample
  responseSubTab: ResponseSubTab
  setResponseSubTab: (tab: ResponseSubTab) => void
  cookiesCount: number
  headersCount: number
  onDownload: () => void
}

/** Postman-Style Response Header Bar: Body | Cookies | Headers | Test Results + Meta Badges */
export function ResponseHeaderBar({
  selectedSample,
  responseSubTab,
  setResponseSubTab,
  cookiesCount,
  headersCount,
  onDownload,
}: ResponseHeaderBarProps) {
  return (
                  <div className="postman-response-header-bar">
                    <div className="postman-response-tabs">
                      <button
                        type="button"
                        className={`postman-res-tab ${responseSubTab === 'body' ? 'active' : ''}`}
                        onClick={() => setResponseSubTab('body')}
                      >
                        Body
                      </button>
                      <button
                        type="button"
                        className={`postman-res-tab ${responseSubTab === 'cookies' ? 'active' : ''}`}
                        onClick={() => setResponseSubTab('cookies')}
                      >
                        Cookies
                        {cookiesCount > 0 ? (
                          <span className="postman-tab-count">{cookiesCount}</span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        className={`postman-res-tab ${responseSubTab === 'headers' ? 'active' : ''}`}
                        onClick={() => setResponseSubTab('headers')}
                      >
                        Headers
                        <span className="postman-tab-count">{headersCount}</span>
                      </button>
                      <button
                        type="button"
                        className={`postman-res-tab ${responseSubTab === 'tests' ? 'active' : ''}`}
                        onClick={() => setResponseSubTab('tests')}
                      >
                        Test Results
                        <span className="postman-tab-count">{selectedSample.success ? '1/1' : '0/1'}</span>
                      </button>
                    </div>

                    <div className="postman-response-meta-group">
                      <span
                        className={`postman-status-badge ${
                          selectedSample.success ? 'status-success' : 'status-error'
                        }`}
                      >
                        {selectedSample.code} {selectedSample.success ? 'OK' : 'Error'}
                      </span>

                      <span className="postman-meta-chip" title="Response Time / Elapsed">
                        <Clock size={12} style={{ verticalAlign: '-1px' }} />
                        {selectedSample.elapsed} ms
                      </span>

                      <span className="postman-meta-chip" title="Response Body Size">
                        <HardDrive size={12} style={{ verticalAlign: '-1px' }} />
                        {selectedSample.bytes > 1024
                          ? `${(selectedSample.bytes / 1024).toFixed(2)} KB`
                          : `${selectedSample.bytes} B`}
                      </span>

                      <button
                        type="button"
                        className="postman-save-btn"
                        onClick={onDownload}
                        title="Save response as JSON file"
                      >
                        <Download size={12} />
                        <span>Save Response</span>
                      </button>
                    </div>
                  </div>
  )
}
