import { useState, useRef, useEffect } from 'react'
import { jmeterSnippets } from './codeEditor/snippets'
import { useCodeHighlight } from './codeEditor/useCodeHighlight'
import { useCodeEditorActions } from './codeEditor/useCodeEditorActions'
import { CodeEditorHeader } from './codeEditor/CodeEditorHeader'
import { VirtualCodeView } from './codeEditor/VirtualCodeView'
import { EditableCodeArea } from './codeEditor/EditableCodeArea'
import type { CodeEditorProps } from '../../models/codeEditor'

export type { CodeEditorProps }

export function CodeEditor({
  label,
  value,
  language = 'groovy',
  placeholder = 'Enter code here...',
  minHeight = 240,
  readOnly = false,
  copyLabel = 'Copy',
  onChange,
}: CodeEditorProps) {
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const hl = useCodeHighlight(value, language, readOnly, minHeight)
  const { normLang, lineCount, isVirtualReadOnlyMode, virtualRange, highlightedHtml, virtualRows } = hl
  const { lineNumbersArray, handleVirtualScroll, virtualScrollerRef } = hl

  const handleScroll = () => {
    if (!textareaRef.current) return
    const { scrollTop, scrollLeft } = textareaRef.current
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop
      preRef.current.scrollLeft = scrollLeft
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop
    }
  }

  const updateCursorPosition = () => {
    if (!textareaRef.current) return
    const pos = textareaRef.current.selectionStart || 0
    const textBefore = (value || '').substring(0, pos)
    const lines = textBefore.split('\n')
    const currentLine = lines.length
    const currentCol = lines[lines.length - 1].length + 1
    setCursorPos({ line: currentLine, col: currentCol })
  }

  const { copied, formatSuccess, handleKeyDown, handleCopy, handleFormat, handleInsertSnippet } =
    useCodeEditorActions({ value, readOnly, onChange, textareaRef, updateCursorPosition })

  useEffect(() => {
    if (isVirtualReadOnlyMode) return
    handleScroll()
  }, [value, isVirtualReadOnlyMode])

  const currentSnippets = jmeterSnippets[normLang] || jmeterSnippets.groovy

  return (
    <div className={`code-editor-wrapper ${isVirtualReadOnlyMode ? 'virtual-readonly-mode' : ''}`}>
      <CodeEditorHeader
        label={label}
        normLang={normLang}
        readOnly={readOnly}
        copyLabel={copyLabel}
        copied={copied}
        formatSuccess={formatSuccess}
        snippets={currentSnippets}
        onFormat={handleFormat}
        onCopy={handleCopy}
        onInsertSnippet={handleInsertSnippet}
      />

      <div className="code-editor-container" style={{ minHeight: minHeight ? `${minHeight}px` : undefined }}>
        {isVirtualReadOnlyMode ? (
          <VirtualCodeView
            scrollerRef={virtualScrollerRef}
            normLang={normLang}
            totalHeight={virtualRange.totalHeight}
            offsetTop={virtualRange.offsetTop}
            rows={virtualRows}
            onScroll={handleVirtualScroll}
          />
        ) : (
          <EditableCodeArea
            textareaRef={textareaRef}
            preRef={preRef}
            lineNumbersRef={lineNumbersRef}
            lineNumbers={lineNumbersArray}
            activeLine={cursorPos.line}
            normLang={normLang}
            highlightedHtml={highlightedHtml}
            value={value}
            placeholder={placeholder}
            readOnly={readOnly}
            onChange={onChange}
            onScroll={handleScroll}
            onCursorMove={updateCursorPosition}
            onKeyDown={handleKeyDown}
          />
        )}
      </div>

      <div className="code-editor-statusbar">
        <span>Line {cursorPos.line}, Col {cursorPos.col}</span>
        <span className="statusbar-separator">•</span>
        <span>{lineCount} lines</span>
        <span className="statusbar-separator">•</span>
        <span>{(value || '').length.toLocaleString()} characters</span>
      </div>
    </div>
  )
}
