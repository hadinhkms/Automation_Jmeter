import { ClipboardPaste, Trash2, AlertTriangle } from 'lucide-react'

interface CurlInputSectionProps {
  curlInput: string
  errorMsg: string
  onChange: (value: string) => void
  onPasteSample: () => void
}

/** Instructions + quick actions, cURL textarea and error notice. */
export function CurlInputSection({ curlInput, errorMsg, onChange, onPasteSample }: CurlInputSectionProps) {
  return (
    <>
    {/* Top Instructions & quick actions */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
        Paste your cURL command below to automatically generate an <strong>HTTP Request</strong> sampler.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={onPasteSample}
          style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
          title="Fill with sample cURL"
        >
          <ClipboardPaste size={13} />
          Sample
        </button>
        {curlInput && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => onChange('')}
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
            title="Clear input"
          >
            <Trash2 size={13} />
            Clear
          </button>
        )}
      </div>
    </div>

    {/* cURL Text Area */}
    <div style={{ position: 'relative' }}>
      <textarea
        className="form-control jmeter-monospace-textarea"
        placeholder={`curl -X POST 'https://api.example.com/v1/auth' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"email":"user@test.com"}'`}
        value={curlInput}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        style={{
          width: '100%',
          fontFamily: 'monospace',
          fontSize: '0.84rem',
          lineHeight: 1.45,
          background: 'var(--editor-bg, #0f172a)',
          color: 'var(--editor-text, #f8fafc)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '6px',
          padding: '10px 12px',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
        autoFocus
      />
    </div>

    {/* Error notice */}
    {errorMsg && (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '6px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          fontSize: '0.82rem',
        }}
      >
        <AlertTriangle size={15} />
        <span>{errorMsg}</span>
      </div>
    )}
    </>
  )
}
