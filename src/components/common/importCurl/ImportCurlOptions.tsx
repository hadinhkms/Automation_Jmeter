import { Layers } from 'lucide-react'
import type { ParsedCurl } from '../../../utils/curlParser'
import type { TestPlanNode } from '../../../models/jmeter'

interface ImportCurlOptionsProps {
  parsed: ParsedCurl | null
  targetNode: TestPlanNode
  samplerName: string
  createHeaderManager: boolean
  createCookieManager: boolean
  onSamplerNameChange: (value: string) => void
  onCreateHeaderManagerChange: (value: boolean) => void
  onCreateCookieManagerChange: (value: boolean) => void
}

/** Sampler name, import destination and child-element checkboxes. */
export function ImportCurlOptions({
  parsed,
  targetNode,
  samplerName,
  createHeaderManager,
  createCookieManager,
  onSamplerNameChange,
  onCreateHeaderManagerChange,
  onCreateCookieManagerChange,
}: ImportCurlOptionsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '4px', color: 'var(--text-color, #e2e8f0)' }}>
          Sampler Name in Test Plan:
        </label>
        <input
          type="text"
          className="form-control"
          value={samplerName}
          onChange={(e) => onSamplerNameChange(e.target.value)}
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
            onChange={(e) => onCreateHeaderManagerChange(e.target.checked)}
          />
          <span>Create <strong>HTTP Header Manager</strong> as child element (with {parsed?.headers.length || 0} headers)</span>
        </label>

        {parsed && parsed.cookies.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={createCookieManager}
              onChange={(e) => onCreateCookieManagerChange(e.target.checked)}
            />
            <span>Create <strong>HTTP Cookie Manager</strong> for {parsed.cookies.length} cookie(s)</span>
          </label>
        )}
      </div>
    </div>
  )
}
