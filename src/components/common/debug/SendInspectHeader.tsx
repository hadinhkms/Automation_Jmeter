import { useState } from 'react'
import { X, Clock, Database, AlertCircle, Copy, Check } from 'lucide-react'
import type { SingleResponseResult } from '../../../services/proxyDebugService'

interface SendInspectHeaderProps {
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

export function SendInspectHeader({ response, onClose }: SendInspectHeaderProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyResponse = () => {
    if (response.body) {
      navigator.clipboard.writeText(response.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
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
          onClick={handleCopyResponse}
          title={copied ? 'Copied Response!' : 'Copy Response'}
          aria-label="Copy Response"
          style={{ height: 24, padding: '0 6px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          {copied ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
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
  )
}
