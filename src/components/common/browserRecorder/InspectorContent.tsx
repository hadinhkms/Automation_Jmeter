import type { RecordedRequest } from '../../../models/recorder'
import type { InspectorTab } from '../../../features/browserRecorder/recorderTypes'
import * as P from '../../../features/browserRecorder/panelStyles'
import { CopyablePre } from './CopyablePre'
import { KeyValueList } from './KeyValueList'

interface InspectorContentProps {
  req: RecordedRequest
  tab: InspectorTab
  copiedKey: string | null
  onCopy: (text: string, key: string) => void
}

export function InspectorContent({ req, tab, copiedKey, onCopy }: InspectorContentProps) {
  const copy = { copiedKey, onCopy }
  return (
    <>
      {tab === 'body' && (
        <div>
          {req.postData ? (
            <CopyablePre {...copy} copyKey="body" copyText={req.postData || ''} fontSize="0.75rem" maxHeight="340px">
              {req.postData}
            </CopyablePre>
          ) : req.postParams && req.postParams.length > 0 ? (
            <KeyValueList items={req.postParams} keyColor="#38bdf8" />
          ) : (
            <p style={P.emptyNote}>No request body payload (GET or query-only request).</p>
          )}
        </div>
      )}

      {tab === 'headers' && <KeyValueList items={req.requestHeaders} keyColor="#818cf8" />}

      {tab === 'query' &&
        (req.queryParams && req.queryParams.length > 0 ? (
          <KeyValueList items={req.queryParams} keyColor="#34d399" />
        ) : (
          <div style={P.column('6px')}>
            <p style={P.emptyNote}>No query string parameters.</p>
          </div>
        ))}

      {tab === 'response' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.75rem' }}>
            <span style={{ color: '#94a3b8' }}>Status:</span>
            <strong style={{ color: '#10b981' }}>{req.responseStatus || '—'} {req.responseStatusText || ''}</strong>
            {req.mimeType && <span style={{ color: '#64748b' }}>({req.mimeType})</span>}
          </div>
          {req.responseBody ? (
            <CopyablePre {...copy} copyKey="response" copyText={req.responseBody || ''} fontSize="0.74rem" maxHeight="320px">
              {req.responseBody.slice(0, 3000)}
              {req.responseBody.length > 3000 ? '\n... [truncated]' : ''}
            </CopyablePre>
          ) : (
            <p style={P.emptyNote}>No response body captured.</p>
          )}
        </div>
      )}

      {tab === 'sensitive' && req.hasSensitiveData && (
        <div style={P.column('8px')}>
          <div style={P.sensitiveIntro}>The following sensitive keys or headers were detected in this request:</div>
          {req.sensitiveFields?.map((f, i) => (
            <div key={i} style={P.sensitiveItem}>
              ● {f}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
