import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-groovy'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import { Copy, Check, Code2, Sparkles, Wand2 } from 'lucide-react'

// Custom JMeter built-in identifiers highlighting in Prism
if (Prism.languages.groovy) {
  Prism.languages.insertBefore('groovy', 'keyword', {
    'jmeter-variable': /\b(vars|props|prev|sampler|ctx|log|OUT|SampleResult|ResponseCode|ResponseMessage)\b/,
    'jmeter-placeholder': /\$\{[a-zA-Z0-9_.-]+\}/,
  })
}

if (Prism.languages.javascript) {
  Prism.languages.insertBefore('javascript', 'keyword', {
    'jmeter-variable': /\b(vars|props|prev|sampler|ctx|log|OUT|SampleResult|ResponseCode|ResponseMessage)\b/,
    'jmeter-placeholder': /\$\{[a-zA-Z0-9_.-]+\}/,
  })
}

if (Prism.languages.json) {
  Prism.languages.insertBefore('json', 'string', {
    'jmeter-placeholder': /\$\{[a-zA-Z0-9_.-]+\}/,
  })
}

if (Prism.languages.bash) {
  Prism.languages.insertBefore('bash', 'string', {
    'jmeter-placeholder': /\$\{[a-zA-Z0-9_.-]+\}/,
  })
}

export interface CodeEditorProps {
  label?: string
  value: string
  language?: string
  placeholder?: string
  minHeight?: number
  readOnly?: boolean
  onChange: (value: string) => void
}

const jmeterSnippets: Record<string, { label: string; code: string }[]> = {
  groovy: [
    { label: 'vars.get(key)', code: 'def myVar = vars.get("variable_name")' },
    { label: 'vars.put(key, value)', code: 'vars.put("variable_name", "my_value")' },
    { label: 'props.get(key)', code: 'def globalProp = props.get("property_name")' },
    { label: 'props.put(key, value)', code: 'props.put("property_name", "my_value")' },
    { label: 'log.info(...)', code: 'log.info("Current variable: " + vars.get("variable_name"))' },
    { label: 'prev.setSuccessful(...)', code: 'prev.setSuccessful(true)\nprev.setResponseCode("200")\nprev.setResponseMessage("OK")' },
    { label: 'Read CSV Lines', code: 'def lines = new File("path/to/file.csv").readLines()\nlines.each { line ->\n    log.info("Line: " + line)\n}' },
    { label: 'Format Current Date', code: 'import java.text.SimpleDateFormat\ndef sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss")\ndef nowFormatted = sdf.format(new Date())\nvars.put("CURRENT_TIME", nowFormatted)' },
    { label: 'JSON Parsing (JsonSlurper)', code: 'import groovy.json.JsonSlurper\ndef response = prev.getResponseDataAsString()\ndef json = new JsonSlurper().parseText(response)\ndef id = json.data?.id\nvars.put("ITEM_ID", id ? id.toString() : "")' },
  ],
  javascript: [
    { label: 'vars.get(key)', code: 'var myVar = vars.get("variable_name");' },
    { label: 'vars.put(key, value)', code: 'vars.put("variable_name", "my_value");' },
    { label: 'log.info(...)', code: 'log.info("Message: " + vars.get("variable_name"));' },
    { label: 'prev.setSuccessful(...)', code: 'prev.setSuccessful(true);\nprev.setResponseCode("200");' },
  ],
  json: [
    { label: 'Login Payload', code: '{\n  "login_name": "${loginEmail}",\n  "password": "${password}",\n  "step": 1\n}' },
    { label: 'Simple Object', code: '{\n  "id": "${id}",\n  "name": "example",\n  "status": true\n}' },
    { label: 'Nested Array Payload', code: '{\n  "items": [\n    { "id": 1, "quantity": 10 },\n    { "id": 2, "quantity": 5 }\n  ]\n}' },
  ],
  bash: [
    { label: 'cURL GET request', code: 'curl -X GET "https://api.example.com/items" \\\n  -H "Accept: application/json"' },
    { label: 'cURL POST JSON', code: 'curl -X POST "https://api.example.com/items" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name": "example", "count": 1}\'' },
    { label: 'cURL Bearer Auth', code: 'curl -X GET "https://api.example.com/me" \\\n  -H "Authorization: Bearer ${token}"' },
  ],
  curl: [
    { label: 'cURL GET request', code: 'curl -X GET "https://api.example.com/items" \\\n  -H "Accept: application/json"' },
    { label: 'cURL POST JSON', code: 'curl -X POST "https://api.example.com/items" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name": "example", "count": 1}\'' },
    { label: 'cURL Bearer Auth', code: 'curl -X GET "https://api.example.com/me" \\\n  -H "Authorization: Bearer ${token}"' },
  ],
}

function formatJsonSafe(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return null
  }
}

function countLines(text: string): number {
  if (!text) return 1

  let lines = 1
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) lines += 1
  }
  return lines
}

const VIRTUAL_LINE_HEIGHT = 20.8
const VIRTUAL_OVERSCAN_LINES = 14

export function CodeEditor({
  label,
  value,
  language = 'groovy',
  placeholder = 'Enter code here...',
  minHeight = 240,
  readOnly = false,
  onChange,
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false)
  const [formatSuccess, setFormatSuccess] = useState(false)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const virtualScrollerRef = useRef<HTMLDivElement>(null)
  const virtualScrollRafRef = useRef<number | null>(null)
  const [virtualViewport, setVirtualViewport] = useState({ scrollTop: 0, clientHeight: minHeight })

  const normLang = useMemo(() => {
    const l = (language || 'groovy').toLowerCase()
    if (l === 'json') return 'json'
    if (l === 'java') return 'java'
    if (l === 'js' || l === 'javascript') return 'javascript'
    if (l === 'curl' || l === 'bash' || l === 'sh' || l === 'shell') return 'bash'
    return 'groovy'
  }, [language])

  const lineCount = useMemo(() => {
    return countLines(value || '')
  }, [value])

  const isVirtualReadOnlyMode = readOnly && ((value || '').length > 60_000 || lineCount > 1_200)

  const virtualLines = useMemo(() => {
    return isVirtualReadOnlyMode ? (value || '').split('\n') : []
  }, [value, isVirtualReadOnlyMode])

  const virtualRange = useMemo(() => {
    const start = Math.max(0, Math.floor(virtualViewport.scrollTop / VIRTUAL_LINE_HEIGHT) - VIRTUAL_OVERSCAN_LINES)
    const visibleLineCount = Math.ceil(virtualViewport.clientHeight / VIRTUAL_LINE_HEIGHT) + VIRTUAL_OVERSCAN_LINES * 2
    const end = Math.min(lineCount, start + visibleLineCount)

    return {
      start,
      end,
      offsetTop: start * VIRTUAL_LINE_HEIGHT,
      totalHeight: lineCount * VIRTUAL_LINE_HEIGHT,
    }
  }, [lineCount, virtualViewport])

  const highlightedHtml = useMemo(() => {
    const text = value || ''
    if (isVirtualReadOnlyMode) return text

    const grammar = Prism.languages[normLang] || Prism.languages.groovy || Prism.languages.clike
    if (!grammar) return text

    try {
      return Prism.highlight(text, grammar, normLang)
    } catch {
      return text
    }
  }, [value, normLang, isVirtualReadOnlyMode])

  const virtualRows = useMemo(() => {
    if (!isVirtualReadOnlyMode) return []

    const grammar = Prism.languages[normLang] || Prism.languages.groovy || Prism.languages.clike
    return virtualLines.slice(virtualRange.start, virtualRange.end).map((line, index) => {
      const lineNumber = virtualRange.start + index + 1
      let html = line || ' '

      if (grammar) {
        try {
          html = Prism.highlight(line || ' ', grammar, normLang)
        } catch {
          html = line || ' '
        }
      }

      return { lineNumber, html }
    })
  }, [isVirtualReadOnlyMode, normLang, virtualLines, virtualRange])

  const lineNumbersArray = useMemo(() => {
    if (isVirtualReadOnlyMode) return []
    return Array.from({ length: lineCount }, (_, i) => i + 1)
  }, [lineCount, isVirtualReadOnlyMode])

  const handleVirtualScroll = useCallback(() => {
    if (!virtualScrollerRef.current || virtualScrollRafRef.current !== null) return

    virtualScrollRafRef.current = window.requestAnimationFrame(() => {
      virtualScrollRafRef.current = null
      const scroller = virtualScrollerRef.current
      if (!scroller) return

      setVirtualViewport((previous) => {
        if (previous.scrollTop === scroller.scrollTop && previous.clientHeight === scroller.clientHeight) {
          return previous
        }
        return { scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight }
      })
    })
  }, [])

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return

    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const spaces = '  ' // 2 spaces for JSON/Groovy

      const newValue = value.substring(0, start) + spaces + value.substring(end)
      onChange(newValue)

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length
        updateCursorPosition()
      }, 0)
    }
  }

  const handleCopy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleFormat = () => {
    if (!value || readOnly) return
    const formatted = formatJsonSafe(value)
    if (formatted) {
      onChange(formatted)
      setFormatSuccess(true)
      setTimeout(() => setFormatSuccess(false), 1500)
    }
  }

  const handleInsertSnippet = (snippetCode: string) => {
    if (readOnly) return

    const textarea = textareaRef.current
    if (!textarea) {
      onChange(value ? `${value}\n\n${snippetCode}` : snippetCode)
      return
    }

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const prefix = start > 0 && value[start - 1] !== '\n' ? '\n' : ''
    const postfix = end < value.length && value[end] !== '\n' ? '\n' : ''
    const inserted = `${prefix}${snippetCode}${postfix}`

    const newValue = value.substring(0, start) + inserted + value.substring(end)
    onChange(newValue)

    setTimeout(() => {
      textarea.focus()
      const newPos = start + inserted.length
      textarea.selectionStart = textarea.selectionEnd = newPos
      updateCursorPosition()
    }, 10)
  }

  useEffect(() => {
    if (isVirtualReadOnlyMode) return
    handleScroll()
  }, [value, isVirtualReadOnlyMode])

  useEffect(() => {
    return () => {
      if (virtualScrollRafRef.current !== null) {
        window.cancelAnimationFrame(virtualScrollRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isVirtualReadOnlyMode || !virtualScrollerRef.current) return

    const scroller = virtualScrollerRef.current
    setVirtualViewport({ scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight })

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      setVirtualViewport({ scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight })
    })
    observer.observe(scroller)

    return () => observer.disconnect()
  }, [isVirtualReadOnlyMode])

  const currentSnippets = jmeterSnippets[normLang] || jmeterSnippets.groovy

  return (
    <div className={`code-editor-wrapper ${isVirtualReadOnlyMode ? 'virtual-readonly-mode' : ''}`}>
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
              onClick={handleFormat}
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
                    handleInsertSnippet(val)
                    e.target.value = ''
                  }
                }}
                title="Insert common code snippet"
              >
                <option value="" disabled>
                  + Snippet...
                </option>
                {currentSnippets.map((s) => (
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
            onClick={handleCopy}
            title="Copy content to clipboard"
          >
            {copied ? <Check size={13} className="success-icon" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="code-editor-container" style={{ minHeight: minHeight ? `${minHeight}px` : undefined }}>
        {isVirtualReadOnlyMode ? (
          <div
            ref={virtualScrollerRef}
            className={`code-editor-virtual-scroller language-${normLang}`}
            onScroll={handleVirtualScroll}
          >
            <div className="code-editor-virtual-spacer" style={{ height: `${virtualRange.totalHeight}px` }}>
              <div className="code-editor-virtual-rows" style={{ transform: `translateY(${virtualRange.offsetTop}px)` }}>
                {virtualRows.map((row) => (
                  <div key={row.lineNumber} className="code-editor-virtual-row">
                    <span className="code-editor-virtual-gutter">{row.lineNumber}</span>
                    <code
                      className={`code-editor-virtual-line language-${normLang}`}
                      dangerouslySetInnerHTML={{ __html: row.html }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* Line Numbers */}
          <div
            ref={lineNumbersRef}
            className="code-editor-gutter"
            aria-hidden="true"
            onWheel={(e) => {
              if (textareaRef.current) {
                textareaRef.current.scrollTop += e.deltaY
                handleScroll()
              }
            }}
          >
            {lineNumbersArray.map((num) => (
              <div key={num} className={`gutter-line ${num === cursorPos.line ? 'active-line' : ''}`}>
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
              updateCursorPosition()
            }}
            onKeyUp={updateCursorPosition}
            onClick={updateCursorPosition}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
          />
        </div>
          </>
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
