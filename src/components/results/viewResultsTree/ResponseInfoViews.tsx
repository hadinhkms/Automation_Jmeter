import { CheckCircle2, XCircle } from 'lucide-react'
import type { JtlSample } from '../../../services/jmeterRunnerService'
import type { HeaderEntry } from './types'

export function ResponseHeadersTable({ headers }: { headers: HeaderEntry[] }) {
  return (
                    <div className="response-headers-table-wrap" style={{ marginTop: '6px' }}>
                      <table className="url-params-table">
                        <thead>
                          <tr>
                            <th style={{ width: '35%' }}>Header Name</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {headers.map((h, idx) => (
                            <tr key={idx}>
                              <td className="param-key">{h.name}</td>
                              <td className="param-val">{h.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
  )
}

export function ResponseCookiesView({ cookies }: { cookies: HeaderEntry[] }) {
  return (
                    <div className="response-cookies-wrap" style={{ marginTop: '6px' }}>
                      {cookies.length > 0 ? (
                        <table className="url-params-table">
                          <thead>
                            <tr>
                              <th>Cookie Name</th>
                              <th>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cookies.map((c, idx) => (
                              <tr key={idx}>
                                <td className="param-key">{c.name}</td>
                                <td className="param-val">{c.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="vrt-no-selection" style={{ minHeight: '120px' }}>
                          No cookies received from server in this response.
                        </div>
                      )}
                    </div>
  )
}

/* Test Results Sub-tab */
export function ResponseTestResults({ selectedSample }: { selectedSample: JtlSample }) {
  return (
                    <div className="response-tests-wrap" style={{ marginTop: '6px', padding: '12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          background: selectedSample.success ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${selectedSample.success ? '#bbf7d0' : '#fecaca'}`,
                          color: selectedSample.success ? '#15803d' : '#b91c1c',
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      >
                        {selectedSample.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        <span>
                          {selectedSample.success
                            ? `PASS: Response code was ${selectedSample.code} (within acceptable range)`
                            : `FAIL: Response code was ${selectedSample.code} (or request timed out)`}
                        </span>
                      </div>
                    </div>
  )
}
