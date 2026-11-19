/** CSV preview for the DDT wizard: delimiter detection, header validation and first-5-row preview. */
import { isBlankRecord, parseCsvRecords } from './csvRecordParser'

export const CSV_MAX_BYTES = 20 * 1024 * 1024
export const CSV_PREVIEW_ROWS = 5
export const CSV_DELIMITERS = [',', ';', '\t'] as const
export type CsvDelimiter = (typeof CSV_DELIMITERS)[number]

export interface CsvPreview {
  delimiter: CsvDelimiter
  headers: string[]
  rows: string[][]
  /** Data rows JMeter will read (header excluded; blank lines inside the file count, trailing blank lines don't). */
  totalRows: number
  quoted: boolean
}

export type CsvPreviewResult = { ok: true; preview: CsvPreview } | { ok: false; error: string }

const ALLOWED_EXT = /\.(csv|tsv|txt|dat)$/i

/** Rejects files that are not text tables, empty, or over the 20MB limit before reading them. */
export function validateCsvFile(file: { name: string; size: number }): string | null {
  if (!ALLOWED_EXT.test(file.name)) return 'Choose a .csv, .tsv, .txt or .dat file.'
  if (file.size === 0) return 'The CSV file is empty.'
  if (file.size > CSV_MAX_BYTES) return `File is ${(file.size / 1048576).toFixed(1)} MB; the limit is 20 MB.`
  return null
}

/** Splits one CSV line, honouring "quoted" cells and "" escapes (cells are not trimmed). */
export function parseCsvLine(line: string, delimiter: string): string[] {
  return parseCsvRecords(line, delimiter, 1).records[0] ?? ['']
}

/** Picks the delimiter (comma, semicolon, tab) that splits the header record into the most cells. */
export function detectDelimiter(text: string): CsvDelimiter {
  let best: CsvDelimiter = ','
  let bestCount = 1
  for (const delimiter of CSV_DELIMITERS) {
    const count = parseCsvLine(text, delimiter).length
    if (count > bestCount) { best = delimiter; bestCount = count }
  }
  return best
}

const DATA_LIKE = [/^[-+]?\d+([.,]\d+)?$/, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, /^https?:\/\//i]

/** Null when the first row reads as column names; otherwise why it doesn't. */
function headerProblem(cells: string[]): string | null {
  const names = cells.map((cell) => cell.trim())
  if (names.some((name) => name === '')) return 'The first row has an empty column name.'
  const dataLike = names.filter((name) => name.length > 64 || DATA_LIKE.some((re) => re.test(name)))
  if (dataLike.length > names.length / 2) return `The first row looks like data ("${dataLike[0].slice(0, 30)}"), not column names.`
  const lower = names.map((name) => name.toLowerCase())
  if (new Set(lower).size !== lower.length) return 'The first row has duplicate column names.'
  return null
}

/** Parses CSV text into a header + first-5-row preview, or a friendly error. */
export function parseCsvPreview(input: string): CsvPreviewResult {
  const text = input.replace(/^﻿/, '')
  if (text.trim() === '') return { ok: false, error: 'The CSV file is empty.' }
  const delimiter = detectDelimiter(text)
  const parsed = parseCsvRecords(text, delimiter)
  if (parsed.unclosedQuoteLine !== null) {
    return { ok: false, error: `A quoted value opened on line ${parsed.unclosedQuoteLine} is never closed. Check for a missing " character.` }
  }
  const records = parsed.records
  while (records.length > 0 && isBlankRecord(records[records.length - 1])) records.pop()
  if (records.length === 0) return { ok: false, error: 'The CSV file is empty.' }

  const headers = records[0]
  const problem = headerProblem(headers)
  if (problem) {
    return { ok: false, error: `${problem} Add a header row such as "username,password" as the first line.` }
  }
  const dataRows = records.slice(1)
  if (dataRows.length === 0) return { ok: false, error: 'The CSV file has a header row but no data rows.' }

  const rows = dataRows.slice(0, CSV_PREVIEW_ROWS).map((cells) => headers.map((_, index) => cells[index] ?? ''))
  return { ok: true, preview: { delimiter, headers, rows, totalRows: dataRows.length, quoted: parsed.quoted } }
}
