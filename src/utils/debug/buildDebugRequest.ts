import type { TableRow, TestPlanNode } from '../../models/jmeter'
import type { SingleRequestConfig } from '../../services/proxyDebugService'
import { resolveVariables } from '../postman/dynamicVariablesEngine'
import { resolveCascadedHeaders } from '../headerScoping'

export interface DebugRequest extends SingleRequestConfig {
  headers: Array<{ name: string; value: string }>
}

/** Methods whose parameters JMeter sends as an x-www-form-urlencoded body when there is no raw body. */
const FORM_METHODS = new Set(['POST', 'PUT', 'PATCH'])

function textProp(node: TestPlanNode, key: string): string {
  const val = node.properties[key]
  return val !== undefined && val !== null ? String(val) : ''
}

function rowsProp(node: TestPlanNode, key: string): TableRow[] {
  const current = node.properties[key]
  // SAFETY: Array.isArray checked; editors always store these table rows as TableRow objects
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

  // Mirror what the JMX writer makes JMeter send: a non-empty raw body replaces the parameters entirely;
  // otherwise parameters go in the query (GET/HEAD/DELETE/OPTIONS...) or as a form body (POST/PUT/PATCH).
  const rawFlag = node.properties.postBodyRaw
  const isRawBody = rawFlag === undefined || rawFlag === null ? Boolean(body) : rawFlag === true || rawFlag === 'true'
  const sendsBody = isRawBody && Boolean(body)
  const params = sendsBody ? [] : rowsProp(node, 'parameters').filter((p) => p.name)
  const encoded = params
    .map((p) => `${encodeURIComponent(resolveVariables(String(p.name), envVars))}=${encodeURIComponent(resolveVariables(String(p.value || ''), envVars))}`)
    .join('&')
  const formBody = FORM_METHODS.has(method) && encoded ? encoded : ''
  const queryString = encoded && !formBody ? (path.includes('?') ? '&' : '?') + encoded : ''
  const requestBody = sendsBody ? body : formBody

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${protocol}://${domain}${port ? `:${port}` : ''}${normalizedPath}${queryString}`

  const headers = resolveCascadedHeaders(node, root).map((h) => ({
    name: resolveVariables(h.name, envVars),
    value: resolveVariables(h.value, envVars),
  }))
  if (requestBody && !headers.some((h) => h.name.toLowerCase() === 'content-type')) {
    headers.push({ name: 'Content-Type', value: formBody ? 'application/x-www-form-urlencoded' : 'application/json' })
  }

  return { method, url, headers, body: requestBody || undefined, timeoutMs: 30000 }
}
