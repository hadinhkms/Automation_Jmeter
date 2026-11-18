import { useState } from 'react'
import { AlertCircle, Loader2, Plus, Server, X } from 'lucide-react'
import { createEmptyMockRoute, MOCK_MAX_ROUTES, type MockRoute } from '../../../models/mockServer'
import { createId } from '../../../utils/ids'
import { mockServerService } from '../../../services/mockServerService'
import { MockRouteForm } from './MockRouteForm'
import { MockRouteTable } from './MockRouteTable'
import { useMockRoutes } from './useMockRoutes'
import './mockServer.css'

interface MockServerManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MockServerManagerModal({ isOpen, onClose }: MockServerManagerModalProps) {
  const { routes, loading, saving, error, upsert, toggle, remove } = useMockRoutes(isOpen)
  const [editing, setEditing] = useState<MockRoute | null>(null)

  if (!isOpen) return null

  const handleSave = async (route: MockRoute) => {
    if (await upsert(route)) setEditing(null)
  }

  const handleDelete = (route: MockRoute) => {
    if (window.confirm(`Delete mock ${route.method} ${route.path}? JMeter calls to it will get 404.`)) void remove(route.id)
  }

  const exampleUrl = mockServerService.urlFor('/mock/sms/send')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container mock-modal" role="dialog" aria-modal="true" aria-labelledby="mock-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <Server size={18} style={{ color: 'var(--accent)' }} />
            <h3 id="mock-modal-title">Local Mock Server</h3>
          </div>
          <button type="button" className="modal-close-button" aria-label="Close mock server" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body mock-modal-body">
          <p className="mock-hint">
            Stub 3rd-party APIs while load testing. Point a sampler at <code>{exampleUrl}</code>. Use <code>:id</code> for a
            variable segment or a trailing <code>*</code> for any sub-path.
          </p>

          {error ? (
            <div className="mock-error" role="alert"><AlertCircle size={14} /> {error}</div>
          ) : null}

          {editing ? (
            <MockRouteForm
              key={editing.id}
              initial={editing}
              others={routes.filter((r) => r.id !== editing.id)}
              saving={saving}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          ) : null}

          {loading ? (
            <div className="mock-empty"><Loader2 size={16} className="spin-icon" /> Loading mocks…</div>
          ) : routes.length === 0 && !editing ? (
            <div className="mock-empty">No mocks yet. Add one to start stubbing endpoints.</div>
          ) : routes.length > 0 ? (
            <MockRouteTable routes={routes} busy={saving || Boolean(editing)} onEdit={setEditing} onToggle={toggle} onDelete={handleDelete} />
          ) : null}
        </div>

        <div className="modal-footer">
          <span className="mock-count">{routes.length} mock{routes.length === 1 ? '' : 's'} · {routes.filter((r) => r.active).length} active</span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || saving || Boolean(editing) || routes.length >= MOCK_MAX_ROUTES}
            onClick={() => setEditing(createEmptyMockRoute(createId()))}
          >
            <Plus size={14} /> Add mock
          </button>
        </div>
      </div>
    </div>
  )
}
