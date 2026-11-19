import { Check, Copy, Download, FileText, Send, Terminal } from 'lucide-react'
import type { MainTab } from './types'

interface DetailTabsBarProps {
  mainTab: MainTab
  setMainTab: (tab: MainTab) => void
  showCurlShortcut: boolean
  onCopyCurl: () => void
  tabCopyText: string | null
  onCopyTab: (text: string) => void
  copied: boolean
}

/** Main Tabs (Sampler result / Request / Response data) plus copy shortcuts. */
export function DetailTabsBar({
  mainTab,
  setMainTab,
  showCurlShortcut,
  onCopyCurl,
  tabCopyText,
  onCopyTab,
  copied,
}: DetailTabsBarProps) {
  return (
              <div className="vrt-tabs-bar">
                <button
                  type="button"
                  className={`vrt-tab ${mainTab === 'sampler-result' ? 'active' : ''}`}
                  onClick={() => setMainTab('sampler-result')}
                >
                  <FileText size={14} />
                  <span>Sampler result</span>
                </button>

                <button
                  type="button"
                  className={`vrt-tab ${mainTab === 'request' ? 'active' : ''}`}
                  onClick={() => setMainTab('request')}
                >
                  <Send size={14} />
                  <span>Request</span>
                </button>

                <button
                  type="button"
                  className={`vrt-tab ${mainTab === 'response' ? 'active' : ''}`}
                  onClick={() => setMainTab('response')}
                >
                  <Download size={14} />
                  <span>Response data</span>
                </button>

                <div className="vrt-tabs-spacer" />

                {/* Shortcut to the request as cURL from any other view; the cURL view has its own copy button */}
                {showCurlShortcut ? (
                  <button
                    type="button"
                    className="vrt-copy-btn curl-btn"
                    onClick={onCopyCurl}
                    title="Copy this request as cURL (Postman import)"
                  >
                    <Terminal size={13} />
                    <span>Copy cURL</span>
                  </button>
                ) : null}

                {tabCopyText ? (
                  <button
                    type="button"
                    className="vrt-copy-btn"
                    onClick={() => onCopyTab(tabCopyText)}
                    title="Copy current tab content"
                  >
                    {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                ) : null}
              </div>
  )
}
