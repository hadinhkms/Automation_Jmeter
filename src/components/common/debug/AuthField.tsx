interface AuthFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  placeholder?: string
  type?: 'text' | 'password'
  wide?: boolean
}

/** Labelled text input with inline validation, used by the Auth wizard forms. */
export function AuthField({ label, value, onChange, error, hint, placeholder, type = 'text', wide }: AuthFieldProps) {
  return (
    <label className={`form-field auth-field ${wide ? 'auth-field-wide' : ''}`}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <small className="auth-field-error">{error}</small> : hint ? <small className="auth-field-hint">{hint}</small> : null}
    </label>
  )
}
