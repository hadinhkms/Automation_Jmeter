import { useState, useMemo, useEffect } from 'react'
import {
  Terminal,
  X,
  PlusCircle,
  Layers,
  ClipboardPaste,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { parseCurlCommand, convertCurlToNodes, type ParsedCurl } from '../../utils/curlParser'
import type { TestPlanNode } from '../../models/jmeter'

interface ImportCurlModalProps {
  isOpen: boolean
  targetNode: TestPlanNode
  onClose: () => void
  onImport: (samplerNode: TestPlanNode, targetParentId?: string) => void
}

const SAMPLE_CURL = `curl 'https://api.vl24hv2.qc.sieuviet-team.com/employer/fe/register-new' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \\
  -d '{"company_name": "Công ty TNHH Demo", "email": "employer@example.com", "phone": "0988776655"}'`

export function ImportCurlModal({
  isOpen,
  targetNode,
  onClose,
  onImport,
}: ImportCurlModalProps) {
  const [curlInput, setCurlInput] = useState('')
  const [samplerName, setSamplerName] = useState('')
  const [createHeaderManager, setCreateHeaderManager] = useState(true)
  const [createCookieManager, setCreateCookieManager] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const parsed: ParsedCurl | null = useMemo(() => {
    if (!curlInput.trim()) return null
    try {
      return parseCurlCommand(curlInput)
    } catch {
      return null
    }
  }, [curlInput])

  useEffect(() => {
    if (parsed) {
      setSamplerName(parsed.suggestedName)
      setErrorMsg('')
    } else {
      setSamplerName('')
    }
  }, [parsed])

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleImport = () => {
    if (!parsed || !parsed.url) {
      setErrorMsg('Please enter a valid cURL command with a target URL.')
      return
    }

    try {
      const { samplerNode } = convertCurlToNodes(
        parsed,
        samplerName,
        createHeaderManager,
        createCookieManager,
      )
      onImport(samplerNode, targetNode.id)
      onClose()
      setCurlInput('')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to import cURL command.')
    }
  }

  const handlePasteSample = () => {
    setCurlInput(SAMPLE_CURL)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container import-curl-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '92%' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} className="modal-icon-accent" style={{ color: 'var(--accent, #6366f1)' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Import from cURL</h3>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                fontWeight: 500,
              }}
            >
              Apache JMeter Tools
            </span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px' }}>
          {/* Top Instructions & quick actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
              Paste your cURL command below to automatically generate an <strong>HTTP Request</strong> sampler.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handlePasteSample}
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
                  onClick={() => setCurlInput('')}
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
              onChange={(e) => setCurlInput(e.target.value)}
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

          {/* Live Parsing Preview Card */}
          {parsed && parsed.url ? (
            <div
              style={{
                background: 'var(--card-bg, #1e293b)',
                border: '1px solid var(--border-color, #334155)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, #334155)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>
                  Parsed Request Preview
                </span>
                <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} />
                  cURL Validated
                </span>
              </div>

              {/* Endpoint Overview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background:
                      parsed.method === 'POST' ? 'rgba(245, 158, 11, 0.2)' :
                      parsed.method === 'GET' ? 'rgba(16, 185, 129, 0.2)' :
                      parsed.method === 'DELETE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    color:
                      parsed.method === 'POST' ? '#fbbf24' :
                      parsed.method === 'GET' ? '#34d399' :
                      parsed.method === 'DELETE' ? '#f87171' : '#818cf8',
                  }}
                >
                  {parsed.method}
                </span>

                <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#38bdf8', wordBreak: 'break-all' }}>
                  {parsed.protocol}://{parsed.server}{parsed.port ? `:${parsed.port}` : ''}{parsed.path}
                </span>
              </div>

              {/* Headers pill list */}
              {parsed.headers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Headers ({parsed.headers.length}):
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {parsed.headers.map((h, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.72rem',
                          background: 'rgba(148, 163, 184, 0.1)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                        }}
                      >
                        <strong>{String(h.name)}</strong>: {String(h.value).slice(0, 30)}{String(h.value).length > 30 ? '...' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Body snippet */}
              {parsed.body && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Body Payload ({parsed.body.length} bytes):
                  </span>
                  <pre
                    style={{
                      margin: 0,
                      maxHeight: '75px',
                      overflowY: 'auto',
                      fontSize: '0.74rem',
                      fontFamily: 'monospace',
                      background: 'var(--editor-bg, #0f172a)',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      color: '#cbd5e1',
                    }}
                  >
                    {parsed.body}
                  </pre>
                </div>
              )}
            </div>
          ) : null}

          {/* Import Configuration Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '4px', color: 'var(--text-color, #e2e8f0)' }}>
                Sampler Name in Test Plan:
              </label>
              <input
                type="text"
                className="form-control"
                value={samplerName}
                onChange={(e) => setSamplerName(e.target.value)}
                placeholder="e.g. 1.0 Register Account"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: '0.84rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #334155)',
                  background: 'var(--input-bg, #1e293b)',
                  color: 'var(--text-color, #f8fafc)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Target Placement Destination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
              <Layers size={14} style={{ color: 'var(--accent, #6366f1)' }} />
              <span>Import destination:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-color, #e2e8f0)' }}>
                {targetNode.name}
              </span>
              <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>({targetNode.type})</span>
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={createHeaderManager}
                  onChange={(e) => setCreateHeaderManager(e.target.checked)}
                />
                <span>Create <strong>HTTP Header Manager</strong> as child element (with {parsed?.headers.length || 0} headers)</span>
              </label>

              {parsed && parsed.cookies.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={createCookieManager}
                    onChange={(e) => setCreateCookieManager(e.target.checked)}
                  />
                  <span>Create <strong>HTTP Cookie Manager</strong> for {parsed.cookies.length} cookie(s)</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '12px 20px', borderTop: '1px solid var(--border-color, #334155)' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleImport}
            disabled={!parsed || !parsed.url}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusCircle size={15} />
            Import into Test Plan
          </button>
        </div>
      </div>
    </div>
  )
}
