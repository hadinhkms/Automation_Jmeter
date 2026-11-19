import { useMemo } from 'react'
import Prism from 'prismjs'
import './prismSetup'
import { countLines, VIRTUAL_LINE_HEIGHT, VIRTUAL_OVERSCAN_LINES } from './codeEditorHelpers'
import { useVirtualViewport } from './useVirtualViewport'

/** Language normalisation, Prism highlighting and virtualised read-only rendering for CodeEditor. */
export function useCodeHighlight(value: string, language: string, readOnly: boolean, minHeight: number) {
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

  const { virtualViewport, virtualScrollerRef, handleVirtualScroll } = useVirtualViewport(isVirtualReadOnlyMode, minHeight)

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

  return {
    normLang,
    lineCount,
    isVirtualReadOnlyMode,
    virtualRange,
    highlightedHtml,
    virtualRows,
    lineNumbersArray,
    handleVirtualScroll,
    virtualScrollerRef,
  }
}
