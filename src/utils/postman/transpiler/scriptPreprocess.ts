/** Pre-processing for the Chai transpiler: comment stripping and continuation-line joining (offsets preserved). */

/** Index just past the string literal whose opening quote is at `i`; an unterminated '/" string stops at the newline. */
export function skipString(text: string, i: number): number {
  const quote = text[i]
  let j = i + 1
  while (j < text.length) {
    const c = text[j]
    if (c === '\\') {
      j += 2
      continue
    }
    if (c === quote) return j + 1
    if (c === '\n' && quote !== '`') return j
    j++
  }
  return text.length
}

const blank = (s: string) => s.replace(/[^\n]/g, ' ')

/**
 * Replaces `//` and `/* *\/` comments with spaces (newlines kept, so offsets and line numbers stay aligned).
 * '...', "..." and `...` strings are skipped, so a URL like "http://x" survives.
 */
export function stripComments(script: string): string {
  let out = ''
  let i = 0
  while (i < script.length) {
    const c = script[i]
    const next = script[i + 1]
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(script, i)
      out += script.slice(i, end)
      i = end
    } else if (c === '/' && next === '/') {
      const nl = script.indexOf('\n', i)
      const end = nl < 0 ? script.length : nl
      out += blank(script.slice(i, end))
      i = end
    } else if (c === '/' && next === '*') {
      const close = script.indexOf('*/', i + 2)
      const end = close < 0 ? script.length : close + 2
      out += blank(script.slice(i, end))
      i = end
    } else {
      out += c
      i++
    }
  }
  return out
}

/** Joins chained lines (`pm.expect(x)\n  .to.eql(1)`) onto the previous line; later steps all work on this joined text. */
export function joinContinuationLines(text: string): string {
  return text.replace(/\r?\n[ \t]*(?=\.(?!\.\.))/g, '')
}
