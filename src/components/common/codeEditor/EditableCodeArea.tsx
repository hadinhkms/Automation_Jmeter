import type { RefObject, KeyboardEvent } from 'react'

interface EditableCodeAreaProps {
  textareaRef: RefObject<HTMLTextAreaElement>
  preRef: RefObject<HTMLPreElement>
  lineNumbersRef: RefObject<HTMLDivElement>
  lineNumbers: number[]
  activeLine: number
  normLang: string
  highlightedHtml: string
  value: string
  placeholder: string
  readOnly: boolean
  onChange: (value: string) => void
  onScroll: () => void
  onCursorMove: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
}

/** Line-number gutter + Prism highlight overlay + transparent textarea. */
export function EditableCodeArea({
  textareaRef,
  preRef,
  lineNumbersRef,
  lineNumbers,
  activeLine,
  normLang,
  highlightedHtml,
  value,
  placeholder,
  readOnly,
  onChange,
  onScroll,
  onCursorMove,
  onKeyDown,
}: EditableCodeAreaProps) {
  return (
    <>
    {/* Line Numbers */}
      <div
        ref={lineNumbersRef}
        className="code-editor-gutter"
        aria-hidden="true"
        onWheel={(e) => {
          if (textareaRef.current) {
            textareaRef.current.scrollTop += e.deltaY
            onScroll()
          }
        }}
      >
        {lineNumbers.map((num) => (
          <div key={num} className={`gutter-line ${num === activeLine ? 'active-line' : ''}`}>
            {num}
          </div>
        ))}
      </div>

    {/* Editor Area: Textarea + Syntax Highlight Pre */}
    <div className="code-editor-content-area">
      <pre
        ref={preRef}
        className={`code-editor-highlight language-${normLang}`}
        aria-hidden="true"
      >
        <code
          className={`language-${normLang}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
        />
      </pre>

      <textarea
        ref={textareaRef}
        className="code-editor-textarea"
        value={value || ''}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        onChange={(e) => {
          if (readOnly) return
          onChange(e.target.value)
          onCursorMove()
        }}
        onKeyUp={onCursorMove}
        onClick={onCursorMove}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
      />
    </div>
    </>
  )
}
