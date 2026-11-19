import { useState, type RefObject } from 'react'
import { copyTextToClipboard } from '../../../utils/clipboard'
import { formatJsonSafe } from './codeEditorHelpers'

interface Options {
  value: string
  readOnly: boolean
  onChange: (value: string) => void
  textareaRef: RefObject<HTMLTextAreaElement>
  updateCursorPosition: () => void
}

/** Keyboard, copy, JSON-format and snippet-insert handlers for CodeEditor. */
export function useCodeEditorActions({ value, readOnly, onChange, textareaRef, updateCursorPosition }: Options) {
  const [copied, setCopied] = useState(false)
  const [formatSuccess, setFormatSuccess] = useState(false)

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
    if (await copyTextToClipboard(value)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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

  return { copied, formatSuccess, handleKeyDown, handleCopy, handleFormat, handleInsertSnippet }
}
