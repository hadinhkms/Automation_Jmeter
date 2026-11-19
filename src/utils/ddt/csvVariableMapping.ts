/** DDT wizard: map CSV columns to JMeter `${var}` names and build the CSVDataSet node properties. */
import type { CsvDelimiter } from './csvPreviewParser'
import { normalizeShareMode, type CsvShareMode } from './csvShareMode'

const VAR_NAME = /^[A-Za-z_][A-Za-z0-9_.]*$/

const LATIN_EXTRA: Record<string, string> = { đ: 'd', Đ: 'D', ø: 'o', Ø: 'O', ł: 'l', Ł: 'L', ß: 'ss', æ: 'ae', Æ: 'AE', œ: 'oe', Œ: 'OE' }

/** Strips diacritics so Vietnamese / Latin headers keep their letters (`tên` -> `ten`, `Đơn giá` -> `Don gia`). */
export function transliterate(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐøØłŁßæÆœŒ]/g, (ch) => LATIN_EXTRA[ch] ?? ch)
}

/**
 * Turns a header cell into a JMeter variable name (`user name` -> `user_name`, `tên` -> `ten`).
 * Headers with no Latin letters/digits (`名前`) fall back to `col_<n>` (1-based) when `index` is given.
 */
export function toVariableName(header: string, index?: number): string {
  const cleaned = transliterate(header).trim().replace(/[^A-Za-z0-9_.]+/g, '_').replace(/^_+|_+$/g, '')
  if (!cleaned) return index === undefined ? '' : `col_${index + 1}`
  return /^[0-9.]/.test(cleaned) ? `_${cleaned}` : cleaned
}

/** Returns an error for each invalid / duplicate variable name, keyed by column index. */
export function validateVariableNames(names: string[]): Record<number, string> {
  const errors: Record<number, string> = {}
  const seen = new Map<string, number>()
  names.forEach((raw, index) => {
    const name = raw.trim()
    if (!name) errors[index] = 'Required'
    else if (!VAR_NAME.test(name)) errors[index] = 'Letters, digits, _ or . only; must not start with a digit'
    else if (seen.has(name)) errors[index] = `Duplicate of column ${(seen.get(name) ?? 0) + 1}`
    else seen.set(name, index)
  })
  return errors
}

export interface CsvDataSetOptions {
  relativePath: string
  delimiter: CsvDelimiter
  variableNames: string[]
  quoted: boolean
  recycle: boolean
  stopThread: boolean
  sharingMode: CsvShareMode
}

/** Properties for a `CSVDataSet` node (header row skipped, names mapped to `${var}`). */
export function buildCsvDataSetProperties(options: CsvDataSetOptions): Record<string, unknown> {
  return {
    filename: options.relativePath,
    encoding: 'UTF-8',
    variableNames: options.variableNames.map((name) => name.trim()).join(','),
    ignoreFirstLine: true,
    delimiter: options.delimiter === '\t' ? '\\t' : options.delimiter,
    quotedData: options.quoted,
    recycle: options.recycle,
    stopThread: options.stopThread,
    sharingMode: normalizeShareMode(options.sharingMode),
  }
}
