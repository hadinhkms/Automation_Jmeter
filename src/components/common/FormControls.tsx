// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import type { ReactNode } from 'react'

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

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string } | string>
  onChange: (value: string) => void
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="checkbox-field">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

export function RadioGroup({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="radio-group">
      <legend>{legend}</legend>
      <div className="radio-options">
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={legend}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
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

export function ApplyToPanel({
  value = 'main',
  variableName = '',
  onValueChange,
  onVariableNameChange,
}: {
  value: string
  variableName: string
  onValueChange: (value: string) => void
  onVariableNameChange: (variableName: string) => void
}) {
  const isMainAndSub = value === 'all' || value === 'main-and-sub'
  const isMain = value === 'main' || value === '' || (!isMainAndSub && value !== 'children' && value !== 'sub' && value !== 'variable')
  const isSub = value === 'children' || value === 'sub'
  const isVariable = value === 'variable'

  return (
    <fieldset className="editor-section apply-to-section">
      <legend>Apply to:</legend>
      <div className="apply-to-options">
        <label className="apply-to-radio">
          <input
            type="radio"
            name="applyToScope"
            value="all"
            checked={isMainAndSub}
            onChange={() => onValueChange('all')}
          />
          <span>Main sample and sub samples</span>
        </label>
        <label className="apply-to-radio">
          <input
            type="radio"
            name="applyToScope"
            value="main"
            checked={isMain}
            onChange={() => onValueChange('main')}
          />
          <span>Main sample only</span>
        </label>
        <label className="apply-to-radio">
          <input
            type="radio"
            name="applyToScope"
            value="children"
            checked={isSub}
            onChange={() => onValueChange('children')}
          />
          <span>Sub samples only</span>
        </label>
        <label className="apply-to-radio apply-to-variable-row">
          <input
            type="radio"
            name="applyToScope"
            value="variable"
            checked={isVariable}
            onChange={() => onValueChange('variable')}
          />
          <span>JMeter Variable Name to use</span>
          <input
            type="text"
            className="scope-variable-input"
            value={variableName}
            disabled={!isVariable}
            placeholder=""
            aria-label="JMeter Variable Name to use"
            onChange={(event) => onVariableNameChange(event.target.value)}
          />
        </label>
      </div>
    </fieldset>
  )
}
