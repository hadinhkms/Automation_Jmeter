import { Copy, Check, Code2, Sparkles, Wand2 } from 'lucide-react'

interface CodeEditorHeaderProps {
  label?: string
  normLang: string
  readOnly: boolean
  copyLabel: string
  copied: boolean
  formatSuccess: boolean
  snippets: { label: string; code: string }[]
  onFormat: () => void
  onCopy: () => void
  onInsertSnippet: (code: string) => void
}

export function CodeEditorHeader({
  label,
  normLang,
  readOnly,
  copyLabel,
  copied,
  formatSuccess,
  snippets,
  onFormat,
  onCopy,
  onInsertSnippet,
}: CodeEditorHeaderProps) {
  return (
    <div className="code-editor-header">
      <div className="code-editor-header-left">
        <Code2 size={15} className="editor-icon" />
        {label ? <span className="editor-label">{label}</span> : <span>Code Editor</span>}
        <span className={`editor-lang-pill lang-${normLang}`}>{normLang.toUpperCase()}</span>
      </div>

      <div className="code-editor-header-right">
        {/* Format JSON button (when in JSON mode) */}
        {normLang === 'json' && !readOnly ? (
          <button
            type="button"
            className="editor-tool-btn"
            onClick={onFormat}
            title="Format / Prettify JSON"
          >
            {formatSuccess ? <Check size={13} className="success-icon" /> : <Wand2 size={13} />}
            <span>{formatSuccess ? 'Formatted' : 'Prettify JSON'}</span>
          </button>
        ) : null}

        {/* Snippets Dropdown */}
        {!readOnly ? (
          <div className="snippets-select-wrap">
            <Sparkles size={13} className="snippet-icon" />
            <select
              className="snippets-select"
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value
                if (val) {
                  onInsertSnippet(val)
                  e.target.value = ''
                }
              }}
              title="Insert common code snippet"
            >
              <option value="" disabled>
                + Snippet...
              </option>
              {snippets.map((s) => (
                <option key={s.label} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Copy Button */}
        <button
          type="button"
          className="editor-tool-btn"
          onClick={onCopy}
          title="Copy content to clipboard"
        >
          {copied ? <Check size={13} className="success-icon" /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : copyLabel}</span>
        </button>
      </div>
    </div>
  )
}
