import type { TableRow, TestPlanNode } from '../../models/jmeter'
import type { HistoryEntry, HistorySource } from '../../services/historyStorageService'
import { isSensitiveHeader, maskString } from '../redaction/sensitiveKeys'

function text(node: TestPlanNode, key: string): string {
  const val = node.properties[key]
  return val !== undefined && val !== null ? String(val) : ''
}

/** Snapshot of the sampler's raw fields (unresolved `${VAR}`/`{{var}}` kept) for exact restore. */
export function samplerSource(node: TestPlanNode): HistorySource {
  const params = node.properties.parameters
  return {
    protocol: text(node, 'protocol'),
    server: text(node, 'domain') || text(node, 'server'),
    port: text(node, 'port'),
    path: text(node, 'path'),
    method: text(node, 'method'),
    body: text(node, 'body'),
    // SAFETY: Array.isArray checked; editors store parameter rows as TableRow objects (copied, not shared)
    parameters: Array.isArray(params) ? (params as TableRow[]).map((row) => ({ ...row })) : [],
  }
}

/** History keeps headers for display only: secret values (Authorization, cookies, API keys) are masked before storing. */
export function maskHistoryHeaders(headers: Array<{ name: string; value: string }>): Array<{ name: string; value: string }> {
  return headers.map((h) => (isSensitiveHeader(h.name) ? { name: h.name, value: maskString(h.value) } : h))
}

const URL_PARTS = /^([a-z][\w+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(?:#.*)?$/i

/** Fallback for old entries without `source`: split the URL by hand so unresolved templates are not lower-cased or encoded. */
function propertiesFromUrl(entry: HistoryEntry): Record<string, unknown> | null {
  const m = URL_PARTS.exec(entry.url.trim())
  if (!m || !m[2]) return null
  const hostMatch = /^(\[[^\]]*\]|[^:]*)(?::(\d*))?$/.exec(m[2])
  if (!hostMatch || !hostMatch[1]) return null

  let path = m[3] || '/'
  try {
    path = decodeURI(path)
  } catch {
    // keep the raw path when it is not valid percent-encoding
  }

  const parameters: TableRow[] = []
  new URLSearchParams(m[4] ?? '').forEach((value, name) => {
    parameters.push({ name, value, encode: true, includeEquals: true })
  })

  return {
    protocol: m[1].toLowerCase(),
    server: hostMatch[1],
    port: hostMatch[2] ?? '',
    path,
    parameters,
  }
}

/**
 * Maps a history entry back onto HTTP Request sampler properties
 * (protocol, server, port, path, query parameters, method, body).
 * Headers are not written back: they come from Header Managers in the tree.
 */
export function historyEntryToProperties(entry: HistoryEntry): Record<string, unknown> | null {
  const src = entry.source
  const target = src
    ? { protocol: src.protocol, server: src.server, port: src.port, path: src.path, parameters: src.parameters.map((row) => ({ ...row })) }
    : propertiesFromUrl(entry)
  if (!target) return null
  return {
    ...target,
    // `server` is the canonical field; clear the legacy `domain` so it cannot shadow it.
    domain: undefined,
    method: src ? src.method || entry.method : entry.method,
    body: src ? src.body : entry.body ?? '',
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
