import type { UrlInfo } from './types'

export function UrlBreakdown({ method, urlInfo }: { method?: string; urlInfo: UrlInfo }) {
  return (
                      <div className="url-breakdown">
                        <div className="url-meta-row">
                          <span className="url-meta-label">Method:</span>
                          <span className="url-method-pill">{method || 'HTTP'}</span>
                          <span className="url-meta-label">Protocol:</span>
                          <span>{urlInfo.protocol}</span>
                          <span className="url-meta-label">Host:</span>
                          <code>{urlInfo.host}</code>
                          <span className="url-meta-label">Path:</span>
                          <code>{urlInfo.pathname}</code>
                        </div>

                        {urlInfo.params.length > 0 ? (
                          <div className="url-params-table-wrap">
                            <span className="params-table-title">Query Parameters:</span>
                            <table className="url-params-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {urlInfo.params.map((p, idx) => (
                                  <tr key={idx}>
                                    <td className="param-key">{p.key}</td>
                                    <td className="param-val">{p.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
  )
}
