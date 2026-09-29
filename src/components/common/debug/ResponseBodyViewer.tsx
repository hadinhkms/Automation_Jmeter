import { useState, useMemo } from 'react'
import { Copy, Check, FileCode, AlignLeft } from 'lucide-react'

interface ResponseBodyViewerProps {
  body: string
  isTruncated?: boolean
}

export function ResponseBodyViewer({ body, isTruncated }: ResponseBodyViewerProps) {
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty')

  const { isJson, formatted } = useMemo(() => {
    if (!body || !body.trim()) return { isJson: false, formatted: '' }
    try {
      const parsed = JSON.parse(body)
      return { isJson: true, formatted: JSON.stringify(parsed, null, 2) }
    } catch {
      return { isJson: false, formatted: body }
    }
  }, [body])

  const displayText = viewMode === 'pretty' && isJson ? formatted : body

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {isJson ? (
            <>
              <button
                type="button"
                className={`inspect-tab-btn ${viewMode === 'pretty' ? 'active' : ''}`}
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => setViewMode('pretty')}
              >
                <FileCode size={12} style={{ marginRight: 4, verticalAlign: -1 }} /> Pretty JSON
              </button>
              <button
                type="button"
                className={`inspect-tab-btn ${viewMode === 'raw' ? 'active' : ''}`}
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => setViewMode('raw')}
              >
                <AlignLeft size={12} style={{ marginRight: 4, verticalAlign: -1 }} /> Raw
              </button>
            </>
          ) : null}
        </div>

        <button
          type="button"
          className="tool-button"
          onClick={handleCopy}
          title="Copy body to clipboard"
          style={{ height: 24, fontSize: 11, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {copied ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy Body'}</span>
        </button>
      </div>

      {isTruncated ? (
        <div style={{ padding: '6px 10px', marginBottom: 8, fontSize: 11, background: 'rgba(234, 88, 12, 0.15)', color: '#f97316', borderRadius: 4 }}>
          ⚠️ Response exceeded 2MB limit and was truncated for browser performance.
        </div>
      ) : null}

      <pre className="body-viewer-pre">
        {displayText || '<Empty Body>'}
      </pre>
    </div>
  )
}
