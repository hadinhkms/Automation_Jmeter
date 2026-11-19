/**
 * Tokenize a cURL command string handling quotes, escaped quotes, and line continuations (\ or ^ or `).
 */
export function tokenizeCurl(curlStr: string): string[] {
  const tokens: string[] = []
  // Normalize line continuations (\ at end of line in bash, ^ in cmd, ` in powershell)
  const normalized = curlStr
    .replace(/\\[\r\n]+/g, ' ')
    .replace(/\^[\r\n]+/g, ' ')
    .replace(/`[\r\n]+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim()

  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]

    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\' && !inSingleQuote) {
      escaped = true
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if ((char === ' ' || char === '\t') && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}
