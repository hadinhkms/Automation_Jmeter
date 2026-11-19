import type { ParsedCurl } from '../../../utils/curlParser'

/** Headers pill list and body snippet of the parsed cURL preview. */
export function CurlPreviewDetails({ parsed }: { parsed: ParsedCurl }) {
  return (
    <>
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
    </>
  )
}
