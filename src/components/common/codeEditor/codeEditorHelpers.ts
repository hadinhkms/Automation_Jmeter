export function formatJsonSafe(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return null
  }
}

export function countLines(text: string): number {
  if (!text) return 1

  let lines = 1
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) lines += 1
  }
  return lines
}

export const VIRTUAL_LINE_HEIGHT = 20.8
export const VIRTUAL_OVERSCAN_LINES = 14
