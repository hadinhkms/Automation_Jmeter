import { Code2, Eye, FileText, Search } from 'lucide-react'
import { CodeEditor } from '../../common/CodeEditor'
import type { JtlSample } from '../../../services/jmeterRunnerService'
import type { SampleDetails } from './useSampleDetails'
import type { DetailTabsState } from './useDetailTabs'
import type { ResponseRenderer } from './types'

interface ResponseBodyViewProps {
  selectedSample: JtlSample
  details: SampleDetails
  tabs: DetailTabsState
}

/** Body Sub-Tab: Controls Bar + Formatted JSON Viewer */
export function ResponseBodyView({ selectedSample, details, tabs }: ResponseBodyViewProps) {
  const { isSelectedHttpRequest, curlResponsePreview, prettyResponseBody, responseBody } = details
  const { responseRenderer, setResponseRenderer, responseSearchQuery, setResponseSearchQuery } = tabs
  return (
                    <>
                      <div className="postman-response-controls-bar">
                        <div className="postman-ctrl-left">
                          <div className="postman-json-select-wrap">
                            <span style={{ color: '#6366f1' }}>{'{ }'}</span>
                            <select
                              className="postman-json-select"
                              value={responseRenderer}
                              // SAFETY: value comes from a select element whose option values are exactly this union
                              onChange={(e) => setResponseRenderer(e.target.value as ResponseRenderer)}
                            >
                              <option value="json">JSON</option>
                              {isSelectedHttpRequest ? (
                                <option value="curl-response">Raw HTTP (Status + Headers + Body)</option>
                              ) : null}
                              <option value="text">Text</option>
                              <option value="html">HTML</option>
                              <option value="xml">XML</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            className={`postman-view-toggle-btn ${responseRenderer === 'json' ? 'active' : ''}`}
                            onClick={() => setResponseRenderer('json')}
                          >
                            <Code2 size={12} />
                            <span>Pretty</span>
                          </button>

                          <button
                            type="button"
                            className={`postman-view-toggle-btn ${responseRenderer === 'text' ? 'active' : ''}`}
                            onClick={() => setResponseRenderer('text')}
                          >
                            <FileText size={12} />
                            <span>Raw</span>
                          </button>

                          <button
                            type="button"
                            className={`postman-view-toggle-btn ${responseRenderer === 'html' ? 'active' : ''}`}
                            onClick={() => setResponseRenderer('html')}
                          >
                            <Eye size={12} />
                            <span>Preview</span>
                          </button>
                        </div>

                        <div className="postman-ctrl-right">
                          <div className="response-search-group">
                            <Search size={12} />
                            <input
                              type="text"
                              placeholder="Search in response..."
                              value={responseSearchQuery}
                              onChange={(e) => setResponseSearchQuery(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="response-rendered-content">
                        {responseRenderer === 'curl-response' && isSelectedHttpRequest ? (
                          <div className="response-curl-wrap">
                            <CodeEditor
                              label={`HTTP Response & Headers (${selectedSample.code} - ${selectedSample.elapsed}ms)`}
                              language="json"
                              value={curlResponsePreview}
                              minHeight={160}
                              readOnly
                              onChange={() => {}}
                            />
                          </div>
                        ) : responseRenderer === 'json' ? (
                          <div className="response-json-wrap">
                            <CodeEditor
                              label={`Response JSON (${selectedSample.code} - ${selectedSample.elapsed}ms)`}
                              language="json"
                              value={prettyResponseBody}
                              minHeight={160}
                              readOnly
                              onChange={() => {}}
                            />
                          </div>
                        ) : (
                          <div className="response-raw-wrap">
                            <pre className="jmeter-monospace-pre">{responseBody}</pre>
                          </div>
                        )}
                      </div>
                    </>
  )
}
