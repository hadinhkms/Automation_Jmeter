import type { TestPlanNode } from '../../models/jmeter'
import { rowsProp, textProp } from '../editorUtils'

export function buildCurlCommand(node: TestPlanNode): string {
  const protocol = textProp(node, 'protocol') || 'https'
  const domain = textProp(node, 'domain') || 'apiv2.vieclam24h.vn'
  const port = textProp(node, 'port') ? `:${textProp(node, 'port')}` : ''
  const path = textProp(node, 'path') || '/'
  const method = (textProp(node, 'method') || 'GET').toUpperCase()
  const body = textProp(node, 'body') || ''
  const params = rowsProp(node, 'parameters')

  let queryString = ''
  if (params.length > 0) {
    const validParams = params.filter((p) => p.name)
    if (validParams.length > 0) {
      queryString =
        (path.includes('?') ? '&' : '?') +
        validParams.map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value || '')}`).join('&')
    }
  }

  const url = `${protocol}://${domain}${port}${path}${queryString}`
  const parts: string[] = []
  parts.push(`curl --location --request ${method} '${url}'`)
  parts.push(`  --header 'Accept: application/json'`)
  if (body || method === 'POST' || method === 'PUT' || method === 'PATCH') {
    parts.push(`  --header 'Content-Type: application/json'`)
  }
  if (body) {
    parts.push(`  --data-raw '${body.replace(/'/g, "\\'")}'`)
  }
  return parts.join(' \\\n')
}
