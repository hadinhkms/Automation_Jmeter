import { useMemo, useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import { MOCK_MAX_DELAY_MS, MOCK_METHODS, validateMockRoute, type MockMethod, type MockRoute } from '../../../models/mockServer'

interface MockRouteFormProps {
  initial: MockRoute
  others: MockRoute[]
  saving: boolean
  onSave: (route: MockRoute) => void
  onCancel: () => void
}

const CONTENT_TYPES = ['application/json', 'application/xml', 'text/plain', 'text/html']

export function MockRouteForm({ initial, others, saving, onSave, onCancel }: MockRouteFormProps) {
  const [draft, setDraft] = useState<MockRoute>(initial)
  const [touched, setTouched] = useState(false)
  const errors = useMemo(() => validateMockRoute(draft, others), [draft, others])
  const hasErrors = Object.keys(errors).length > 0
  const show = (key: keyof typeof errors) => (touched || draft[key] !== initial[key] ? errors[key] : undefined)

  const set = <K extends keyof MockRoute>(key: K, value: MockRoute[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!hasErrors) onSave({ ...draft, path: draft.path.trim() })
  }

  return (
    <form className="mock-form" onSubmit={submit} noValidate>
      <div className="mock-form-grid">
        <label className="form-field">
          Method
          <select value={draft.method} onChange={(e) => set('method', e.target.value as MockMethod)}>
            {MOCK_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="form-field mock-form-path">
          <span>Path <span className="mock-required">*</span></span>
          <input value={draft.path} placeholder="/mock/sms/send" autoFocus onChange={(e) => set('path', e.target.value)} aria-invalid={Boolean(show('path'))} />
          {show('path') ? <span className="field-error">{show('path')}</span> : null}
        </label>
        <label className="form-field">
          <span>Status <span className="mock-required">*</span></span>
          <input type="number" min={100} max={599} value={Number.isNaN(draft.status) ? '' : draft.status} onChange={(e) => set('status', e.target.valueAsNumber)} aria-invalid={Boolean(show('status'))} />
          {show('status') ? <span className="field-error">{show('status')}</span> : null}
        </label>
        <label className="form-field">
          Delay (ms)
          <input type="number" min={0} max={MOCK_MAX_DELAY_MS} step={50} value={Number.isNaN(draft.delayMs) ? '' : draft.delayMs} onChange={(e) => set('delayMs', e.target.valueAsNumber)} aria-invalid={Boolean(show('delayMs'))} />
          {show('delayMs') ? <span className="field-error">{show('delayMs')}</span> : null}
        </label>
        <label className="form-field">
          Content-Type
          <select value={draft.contentType} onChange={(e) => set('contentType', e.target.value)}>
            {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <label className="form-field">
        Response body
        <textarea className="mock-form-body" value={draft.body} spellCheck={false} onChange={(e) => set('body', e.target.value)} aria-invalid={Boolean(show('body'))} />
        {show('body') ? <span className="field-error">{show('body')}</span> : null}
      </label>
      <div className="mock-form-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving || (touched && hasErrors)}>
          {saving ? <Loader2 size={13} className="spin-icon" /> : <Save size={13} />}
          {saving ? 'Saving…' : 'Save mock'}
        </button>
      </div>
    </form>
  )
}
