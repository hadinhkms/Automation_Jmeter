import type { TableRow, TestPlanNode } from '../../models/jmeter'
import type { SingleRequestConfig } from '../../services/proxyDebugService'
import { resolveVariables } from '../postman/dynamicVariablesEngine'
import { resolveCascadedHeaders } from '../headerScoping'

export interface DebugRequest extends SingleRequestConfig {
  headers: Array<{ name: string; value: string }>
}

function textProp(node: TestPlanNode, key: string): string {
  const val = node.properties[key]
  return val !== undefined && val !== null ? String(val) : ''
}

function rowsProp(node: TestPlanNode, key: string): TableRow[] {
  const current = node.properties[key]
  return Array.isArray(current) ? (current as TableRow[]) : []
}

/** Resolves an HTTP sampler (with env variables and cascaded headers) into a single proxy request. */
export function buildDebugRequest(node: TestPlanNode, root: TestPlanNode, envVars: Record<string, string>): DebugRequest {
  let protocol = resolveVariables(textProp(node, 'protocol') || 'https', envVars).trim()
  let domain = resolveVariables(textProp(node, 'domain') || textProp(node, 'server'), envVars).trim()
  const port = resolveVariables(textProp(node, 'port'), envVars).trim()
  let path = resolveVariables(textProp(node, 'path') || '/', envVars).trim()
  const method = (textProp(node, 'method') || 'GET').toUpperCase()
  const body = resolveVariables(textProp(node, 'body') || '', envVars)

  // The server field may hold a full URL such as https://domain.com/base
  if (/^https?:\/\//i.test(domain)) {
    try {
      const parsed = new URL(domain)
      protocol = parsed.protocol.replace(':', '')
      domain = parsed.hostname + (parsed.port ? `:${parsed.port}` : '')
      if (parsed.pathname && parsed.pathname !== '/') path = `${parsed.pathname}${path === '/' ? '' : path}`
    } catch {
      // keep the raw values
    }
  }

  const params = rowsProp(node, 'parameters').filter((p) => p.name)
  const query = params
    .map((p) => `${encodeURIComponent(resolveVariables(String(p.name), envVars))}=${encodeURIComponent(resolveVariables(String(p.value || ''), envVars))}`)
    .join('&')
  const queryString = query ? (path.includes('?') ? '&' : '?') + query : ''

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${protocol}://${domain}${port ? `:${port}` : ''}${normalizedPath}${queryString}`

  const headers = resolveCascadedHeaders(node, root).map((h) => ({
    name: resolveVariables(h.name, envVars),
    value: resolveVariables(h.value, envVars),
  }))
  if (body && !headers.some((h) => h.name.toLowerCase() === 'content-type')) {
    headers.push({ name: 'Content-Type', value: 'application/json' })
  }

  return { method, url, headers, body: body || undefined, timeoutMs: 30000 }
}
