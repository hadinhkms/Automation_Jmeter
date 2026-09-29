import { useState } from 'react'
import { X, Clock, Database, AlertCircle } from 'lucide-react'
import type { SingleResponseResult } from '../../../services/proxyDebugService'
import { ResponseBodyViewer } from './ResponseBodyViewer'
import { ResponseHeadersTable } from './ResponseHeadersTable'
import './debugPanel.css'

interface SendInspectPanelProps {
  response: SingleResponseResult
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getStatusBadgeClass(status: number): string {
  if (status >= 200 && status < 300) return 'status-badge-2xx'
  if (status >= 400 && status < 500) return 'status-badge-4xx'
  return 'status-badge-5xx'
}

export function SendInspectPanel({ response, onClose }: SendInspectPanelProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'raw'>('body')

  return (
    <div className="send-inspect-drawer" role="region" aria-label="Response Inspector">
      <div className="send-inspect-header">
        <div className="send-inspect-badges">
          <span className={`inspect-badge ${getStatusBadgeClass(response.status)}`}>
            {response.status} {response.statusText || (response.status === 0 ? 'Network Error' : '')}
          </span>
          <span className="inspect-badge metric-badge" title="Response Latency">
            <Clock size={12} /> {response.latencyMs} ms
          </span>
          <span className="inspect-badge metric-badge" title="Response Size">
            <Database size={12} /> {formatBytes(response.sizeBytes)}
          </span>
          {response.truncated ? (
            <span className="inspect-badge warning-badge" title="Response truncated">
              <AlertCircle size={12} /> Truncated (2MB cap)
            </span>
          ) : null}
        </div>

        <div className="send-inspect-actions">
          <button
            type="button"
            className="tool-button"
            onClick={onClose}
            title="Close response drawer"
            aria-label="Close response drawer"
            style={{ width: 24, height: 24 }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

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
