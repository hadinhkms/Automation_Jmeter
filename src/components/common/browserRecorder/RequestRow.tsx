import { ShieldAlert } from 'lucide-react'
import type { RecordedRequest } from '../../../models/recorder'
import { methodColor, statusColor } from '../../../features/browserRecorder/recorderLogic'
import * as P from '../../../features/browserRecorder/panelStyles'

interface RequestRowProps {
  req: RecordedRequest
  idx: number
  isSelected: boolean
  isInspected: boolean
  onInspect: (id: string) => void
  onToggle: (id: string) => void
}

export function RequestRow({ req, idx, isSelected, isInspected, onInspect, onToggle }: RequestRowProps) {
  return (
    <tr
      className={`recorder-row ${isInspected ? 'inspected-row' : ''}`}
      onClick={() => onInspect(req.id)}
      style={P.tableRow(isInspected, idx)}
    >
      <td style={{ textAlign: 'center', padding: '6px 8px' }} onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={isSelected} onChange={() => onToggle(req.id)} />
      </td>
      <td style={P.cell}>
        <span style={P.methodTag(methodColor(req.method))}>{req.method}</span>
      </td>
      <td style={P.cell}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColor(req.responseStatus) }}>
          {req.responseStatus || (req.error ? 'ERR' : '...')}
        </span>
      </td>
      <td style={P.pathCell} title={req.url}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {req.hasSensitiveData && (
            <span title={`Sensitive data detected: ${req.sensitiveFields?.join(', ')}`}>
              <ShieldAlert size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
            </span>
          )}
          <span style={P.pathText}>{req.path || req.url}</span>
        </div>
      </td>
      <td style={P.txCell} title={req.transaction}>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{req.transaction}</span>
      </td>
      <td style={P.timeCell}>{req.durationMs ? `${req.durationMs}ms` : '—'}</td>
    </tr>
  )
}
