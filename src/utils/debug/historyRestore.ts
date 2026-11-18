import type { TableRow } from '../../models/jmeter'
import type { HistoryEntry } from '../../services/historyStorageService'

/**
 * Maps a history entry back onto HTTP Request sampler properties
 * (protocol, server, port, path, query parameters, method, body).
 * Headers are not written back: they come from Header Managers in the tree.
 */
export function historyEntryToProperties(entry: HistoryEntry): Record<string, unknown> | null {
  let parsed: URL
  try {
    parsed = new URL(entry.url)
  } catch {
    return null
  }

  const parameters: TableRow[] = []
  parsed.searchParams.forEach((value, name) => {
    parameters.push({ name, value, encode: true, includeEquals: true })
  })

  return {
    protocol: parsed.protocol.replace(':', ''),
    server: parsed.hostname,
    // `server` is the canonical field; clear the legacy `domain` so it cannot shadow it.
    domain: undefined,
    port: parsed.port,
    path: parsed.pathname || '/',
    parameters,
    method: entry.method,
    body: entry.body ?? '',
  }
}

export function statusTone(status: number): '2xx' | '3xx' | '4xx' | '5xx' | 'err' {
  if (status >= 500) return '5xx'
  if (status >= 400) return '4xx'
  if (status >= 300) return '3xx'
  if (status >= 200) return '2xx'
  return 'err'
}

export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(timestamp).toLocaleDateString()
}
