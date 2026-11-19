import { skipString } from './scriptPreprocess'

/** A `{ ... }` block; `headerStart` is where its controlling statement begins (an `else`/`catch` reaches back to its `if`/`try`). */
export interface CodeBlock {
  open: number
  close: number
  headerStart: number
  conditional: boolean
}

const CONTROL = /\b(?:if|else|for|while|switch|do|try|catch|finally)\b|\.(?:forEach|map|filter|some|every|find|reduce)\s*\(|(?<!\?)\?(?![.?])/
const STRINGS = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g

/** True when the statement text makes what follows conditional or repeated (string contents are ignored). */
export function isControlHeader(header: string): boolean {
  return CONTROL.test(header.replace(STRINGS, '""'))
}

/** String-aware scan of every brace block, with its header (text since the previous `;`, `{` or `}`). */
export function findBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = []
  const stack: CodeBlock[] = []
  let lastDelim = -1
  let lastClosed: CodeBlock | null = null
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(text, i) - 1
    } else if (c === '{') {
      const header = text.slice(lastDelim + 1, i)
      let headerStart = lastDelim + 1 + (header.length - header.trimStart().length)
      if (lastClosed && /^\s*(?:else|catch|finally)\b/.test(header)) headerStart = lastClosed.headerStart
      const block: CodeBlock = { open: i, close: text.length, headerStart, conditional: isControlHeader(header) }
      stack.push(block)
      blocks.push(block)
      lastDelim = i
      lastClosed = null
    } else if (c === '}') {
      const block = stack.pop()
      if (block) {
        block.close = i
        lastClosed = block
      }
      lastDelim = i
    } else if (c === ';') {
      lastDelim = i
      lastClosed = null
    }
  }
  return blocks
}

/** True when the code at `index` only runs under a condition or loop (enclosing block or brace-less `if`/`else`). */
export function isConditionalAt(text: string, index: number, blocks: CodeBlock[]): boolean {
  if (blocks.some((b) => b.conditional && b.open < index && index < b.close)) return true
  const prefixStart = Math.max(text.lastIndexOf(';', index - 1), text.lastIndexOf('{', index - 1), text.lastIndexOf('}', index - 1)) + 1
  return isControlHeader(text.slice(prefixStart, index))
}
