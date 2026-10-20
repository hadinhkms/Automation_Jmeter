import { useState } from 'react'
import type { SingleResponseResult } from '../../../services/proxyDebugService'
import { SendInspectHeader } from './SendInspectHeader'
import { ResponseBodyViewer } from './ResponseBodyViewer'
import { ResponseHeadersTable } from './ResponseHeadersTable'
import './debugPanel.css'

interface SendInspectPanelProps {
  response: SingleResponseResult
  onClose: () => void
}

export function SendInspectPanel({ response, onClose }: SendInspectPanelProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'raw'>('body')

  return (
    <div className="send-inspect-drawer" role="region" aria-label="Response Inspector">
      <SendInspectHeader response={response} onClose={onClose} />

      <div className="inspect-tab-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'body'}
          className={`inspect-tab-btn ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          Response Body
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'headers'}
          className={`inspect-tab-btn ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers ({response.headers.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'raw'}
          className={`inspect-tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          Raw Response
        </button>
      </div>

      <div className="inspect-tab-content">
        {activeTab === 'body' ? (
          <ResponseBodyViewer body={response.body} isTruncated={response.truncated} />
        ) : null}

        {activeTab === 'headers' ? (
          <ResponseHeadersTable headers={response.headers} />
        ) : null}

        {activeTab === 'raw' ? (
          <pre className="body-viewer-pre">
            {response.body || '<Empty response>'}
          </pre>
        ) : null}
      </div>
    </div>
  )
}
