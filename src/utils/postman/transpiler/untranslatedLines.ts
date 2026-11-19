import type { CodeBlock } from './blockContext'

export const PM_USAGE = /\b(?:pm|postman|responseBody|responseCode|tests)\b/

const QUOTED = String.raw`(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|` + '`' + String.raw`(?:[^` + '`' + String.raw`\\]|\\.)*` + '`)'

/** Pure structure that needs no translation: pm.test wrappers, json() parsing, closers, `;`, braces, whitespace. */
const STRUCTURE: RegExp[] = [
  new RegExp(String.raw`pm\.test\s*\(\s*${QUOTED}\s*,\s*(?:async\s+)?(?:function\s*\(\s*\)|\(\s*\)\s*=>)\s*\{`, 'g'),
  /(?:var|let|const)\s+[\w$]+\s*=\s*(?:pm\.response\.json\(\)|JSON\.parse\(\s*responseBody\s*\))(?=\s*(?:;|$))/g,
  /\}\s*\)/g,
  /[;{}\s]/g,
]

function lineOf(starts: number[], offset: number): number {
  let line = 0
  while (line + 1 < starts.length && starts[line + 1] <= offset) line++
  return line
}

/**
 * Lines still holding Postman API usage once consumed match spans and pure structure are removed.
 * A line inside a conditional/loop block pulls in the whole block (with its `if`/loop header) so the stub keeps the logic.
 */
export function findUntranslatedLines(code: string, consumed: Array<[number, number]>, blocks: CodeBlock[]): string[] {
  const lines = code.split('\n')
  const starts: number[] = []
  let offset = 0
  for (const line of lines) {
    starts.push(offset)
    offset += line.length + 1
  }

  const selected = new Set<number>()
  lines.forEach((line, idx) => {
    const start = starts[idx]
    const end = start + line.length
    let residual = line
    for (const [s, e] of consumed) {
      if (s >= end || e <= start) continue
      const from = Math.max(s, start) - start
      const to = Math.min(e, end) - start
      residual = residual.slice(0, from) + ' '.repeat(to - from) + residual.slice(to)
    }
    for (const re of STRUCTURE) residual = residual.replace(re, '')
    if (!residual || !PM_USAGE.test(residual)) return
    selected.add(idx)
    for (const b of blocks) {
      if (!b.conditional || b.open >= end || b.close < start) continue
      for (let l = lineOf(starts, b.headerStart); l <= lineOf(starts, b.close); l++) selected.add(l)
    }
  })

  return [...selected].sort((a, b) => a - b).map((i) => lines[i].trim()).filter(Boolean)
}
