import { useState } from 'react'
import { Check, Copy, Pencil, Trash2 } from 'lucide-react'
import type { MockRoute } from '../../../models/mockServer'
import { mockServerService } from '../../../services/mockServerService'

interface MockRouteTableProps {
  routes: MockRoute[]
  busy: boolean
  onEdit: (route: MockRoute) => void
  onToggle: (id: string) => void
  onDelete: (route: MockRoute) => void
}

function statusTone(status: number): string {
  if (status >= 500) return 'mock-status-5xx'
  if (status >= 400) return 'mock-status-4xx'
  if (status >= 300) return 'mock-status-3xx'
  return 'mock-status-2xx'
}

export function MockRouteTable({ routes, busy, onEdit, onToggle, onDelete }: MockRouteTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyUrl = async (route: MockRoute) => {
    try {
      await navigator.clipboard.writeText(mockServerService.urlFor(route.path))
      setCopiedId(route.id)
      window.setTimeout(() => setCopiedId((id) => (id === route.id ? null : id)), 1500)
    } catch {
      window.prompt('Copy this URL:', mockServerService.urlFor(route.path))
    }
  }

  return (
    <div className="mock-table-wrap">
      <table className="mock-table">
        <thead>
          <tr>
            <th>Active</th>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Status</th>
            <th>Delay</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {routes.map((route) => (
            <tr key={route.id} className={route.active ? '' : 'mock-row-inactive'}>
              <td data-label="Active">
                <button
                  type="button"
                  role="switch"
                  aria-checked={route.active}
                  aria-label={`${route.active ? 'Disable' : 'Enable'} ${route.method} ${route.path}`}
                  className={`mock-switch ${route.active ? 'on' : ''}`}
                  disabled={busy}
                  onClick={() => onToggle(route.id)}
                >
                  <span />
                </button>
              </td>
              <td data-label="Method"><span className="mock-method">{route.method}</span></td>
              <td data-label="Endpoint" className="mock-path-cell">
                <code title={route.path}>{route.path}</code>
              </td>
              <td data-label="Status"><span className={`mock-status ${statusTone(route.status)}`}>{route.status}</span></td>
              <td data-label="Delay">{route.delayMs} ms</td>
              <td className="mock-actions">
                <button type="button" className="btn-icon" title="Copy URL for JMeter" aria-label={`Copy URL of ${route.path}`} onClick={() => copyUrl(route)}>
                  {copiedId === route.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button type="button" className="btn-icon" title="Edit" aria-label={`Edit ${route.path}`} disabled={busy} onClick={() => onEdit(route)}>
                  <Pencil size={14} />
                </button>
                <button type="button" className="btn-icon mock-delete" title="Delete" aria-label={`Delete ${route.path}`} disabled={busy} onClick={() => onDelete(route)}>
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
