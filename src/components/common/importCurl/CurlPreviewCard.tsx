import { CheckCircle2 } from 'lucide-react'
import type { ParsedCurl } from '../../../utils/curlParser'
import { CurlPreviewDetails } from './CurlPreviewDetails'

/** Live parsing preview: header, method badge + endpoint, then headers/body details. */
export function CurlPreviewCard({ parsed }: { parsed: ParsedCurl }) {
  return (
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

      <CurlPreviewDetails parsed={parsed} />
    </div>
  )
}
