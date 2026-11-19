import { Terminal } from 'lucide-react'
import type { RequestSubTab } from './types'

interface RequestSubtabsBarProps {
  activeRequestSubTab: RequestSubTab
  setRequestSubTab: (tab: RequestSubTab) => void
  isSelectedHttpRequest: boolean
}

export function RequestSubtabsBar({ activeRequestSubTab, setRequestSubTab, isSelectedHttpRequest }: RequestSubtabsBarProps) {
  return (
                  <div className="vrt-subtabs-bar">
                    {isSelectedHttpRequest ? (
                      <button
                        type="button"
                        className={`vrt-subtab ${activeRequestSubTab === 'curl' ? 'active' : ''}`}
                        onClick={() => setRequestSubTab('curl')}
                      >
                        <Terminal size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                        cURL (Postman Snippet)
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`vrt-subtab ${activeRequestSubTab === 'body' ? 'active' : ''}`}
                      onClick={() => setRequestSubTab('body')}
                    >
                      Request Body
                    </button>
                    <button
                      type="button"
                      className={`vrt-subtab ${activeRequestSubTab === 'headers' ? 'active' : ''}`}
                      onClick={() => setRequestSubTab('headers')}
                    >
                      Request headers
                    </button>
                    {isSelectedHttpRequest ? (
                      <button
                        type="button"
                        className={`vrt-subtab ${activeRequestSubTab === 'url' ? 'active' : ''}`}
                        onClick={() => setRequestSubTab('url')}
                      >
                        URL & Parameters
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`vrt-subtab ${activeRequestSubTab === 'raw' ? 'active' : ''}`}
                      onClick={() => setRequestSubTab('raw')}
                    >
                      Raw Request
                    </button>
                  </div>
  )
}
