/** Quote-aware CSV state machine (RFC 4180 + JMeter quotedData): "..." cells may hold delimiters, newlines and "" escapes. */

export interface CsvParseResult {
  records: string[][]
  /** True when at least one cell anywhere in the text was quoted. */
  quoted: boolean
  /** Set when the text ends inside an open quote; `line` is the 1-based line where that quote opened. */
  unclosedQuoteLine: number | null
  /** Line ending style seen first: \r\n, \n, \r (old Mac) or none. */
  lineEnding: 'crlf' | 'lf' | 'cr' | 'none'
}

/**
 * Splits the whole text into records. A quote only opens a quoted cell at the very start of a cell (like JMeter);
 * cell values are never trimmed. `maxRecords` stops early (used for delimiter detection).
 */
export function parseCsvRecords(text: string, delimiter: string, maxRecords = Infinity): CsvParseResult {
  const records: string[][] = []
  let row: string[] = []
  let cell = ''
  let cellStarted = false
  let inQuotes = false
  let quoted = false
  let line = 1
  let quoteLine = 0
  let lineEnding: CsvParseResult['lineEnding'] = 'none'
  const endRecord = () => {
    row.push(cell)
    records.push(row)
    row = []
    cell = ''
    cellStarted = false
  }

  for (let i = 0; i < text.length && records.length < maxRecords; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else {
        if (ch === '\n' || (ch === '\r' && text[i + 1] !== '\n')) line++
        cell += ch
      }
    } else if (ch === '"' && !cellStarted) {
      inQuotes = true
      quoted = true
      cellStarted = true
      quoteLine = line
    } else if (ch === delimiter) {
      row.push(cell)
      cell = ''
      cellStarted = false
    } else if (ch === '\r' || ch === '\n') {
      const crlf = ch === '\r' && text[i + 1] === '\n'
      if (lineEnding === 'none') lineEnding = crlf ? 'crlf' : ch === '\r' ? 'cr' : 'lf'
      if (crlf) i++
      line++
      endRecord()
    } else {
      cell += ch
      cellStarted = true
    }
  }
  if (records.length < maxRecords && (cellStarted || cell !== '' || row.length > 0)) endRecord()
  return { records, quoted, unclosedQuoteLine: inQuotes ? quoteLine : null, lineEnding }
}

/** A record JMeter reads as an empty line (single empty cell). */
export const isBlankRecord = (record: string[]) => record.length === 1 && record[0].trim() === ''
