export interface CodeEditorProps {
  label?: string
  value: string
  language?: string
  placeholder?: string
  minHeight?: number
  readOnly?: boolean
  /** Text of the built-in copy button, e.g. "Copy cURL" (defaults to "Copy") */
  copyLabel?: string
  onChange: (value: string) => void
}
