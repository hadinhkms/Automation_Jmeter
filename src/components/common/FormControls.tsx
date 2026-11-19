import type { ReactNode } from 'react'

export { SelectField, CheckboxField, RadioGroup } from './formControls/ChoiceFields'
export { ApplyToPanel } from './formControls/ApplyToPanel'

export function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <fieldset className="editor-section">
      <legend>{title}</legend>
      <div className="section-content">{children}</div>
    </fieldset>
  )
}

export function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  min,
  max,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: 'text' | 'number'
  placeholder?: string
  error?: string
  min?: number
  max?: number
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 5,
  monospace = false,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  monospace?: boolean
  placeholder?: string
}) {
  return (
    <label className="form-field form-field-textarea">
      <span>{label}</span>
      <textarea
        value={value}
        rows={rows}
        className={monospace ? 'monospace' : undefined}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
