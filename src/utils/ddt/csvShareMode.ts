/** JMeter CSVDataSet `shareMode` values. Anything else is an identifier shared by every CSV Data Set that uses it. */
export const SHARE_MODE_ALL = 'shareMode.all'
export const SHARE_MODE_GROUP = 'shareMode.group'
export const SHARE_MODE_THREAD = 'shareMode.thread'
/** Editor-only marker: the real value lives in the `identifier` property. */
export const SHARE_MODE_IDENTIFIER = 'identifier'

export type CsvShareMode = typeof SHARE_MODE_ALL | typeof SHARE_MODE_GROUP | typeof SHARE_MODE_THREAD

const LEGACY: Record<string, CsvShareMode> = { all: SHARE_MODE_ALL, group: SHARE_MODE_GROUP, thread: SHARE_MODE_THREAD }
const CANONICAL = new Set<string>([SHARE_MODE_ALL, SHARE_MODE_GROUP, SHARE_MODE_THREAD])

/** Maps legacy short values (`thread`) and blanks to the JMeter constant; other values are returned unchanged. */
export function normalizeShareMode(raw: unknown): string {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return SHARE_MODE_ALL
  return LEGACY[text] ?? text
}

export function isStandardShareMode(value: string): value is CsvShareMode {
  return CANONICAL.has(value)
}

/** Value written to the JMX `shareMode` property from the editor's `sharingMode` + `identifier` pair. */
export function shareModeToJmx(sharingMode: unknown, identifier: unknown): string {
  const mode = normalizeShareMode(sharingMode)
  if (mode !== SHARE_MODE_IDENTIFIER) return mode
  const id = typeof identifier === 'string' ? identifier.trim() : ''
  return id || SHARE_MODE_ALL
}

/** Editor properties for a JMX `shareMode` value (inverse of {@link shareModeToJmx}). */
export function shareModeFromJmx(raw: string): { sharingMode: string; identifier: string } {
  const mode = normalizeShareMode(raw)
  if (isStandardShareMode(mode)) return { sharingMode: mode, identifier: '' }
  if (mode === SHARE_MODE_IDENTIFIER) return { sharingMode: SHARE_MODE_ALL, identifier: '' }
  return { sharingMode: SHARE_MODE_IDENTIFIER, identifier: mode }
}
