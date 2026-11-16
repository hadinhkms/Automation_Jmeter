import type { RecordedRequest } from '../../models/recorder'
import type { TestPlanNode } from '../../models/jmeter'
import { isStaticUrl, isAnalyticsUrl, type ConversionOptions } from '../../utils/recordedRequestConverter'
import {
  CONTAINER_TYPES,
  type ContainerOption,
  type ImportOptionFlags,
  type InspectorTab,
  type RequestFilterState,
  type TypeFilter,
} from './recorderTypes'

export function collectContainers(node: TestPlanNode, depth = 0): ContainerOption[] {
  const result: ContainerOption[] = []
  if (CONTAINER_TYPES.includes(node.type)) {
    result.push({ id: node.id, name: node.name, type: node.type, depth })
  }
  for (const child of node.children) {
    result.push(...collectContainers(child, depth + 1))
  }
  return result
}

function matchesType(req: RecordedRequest, typeFilter: TypeFilter): boolean {
  if (typeFilter === 'XHR') {
    const rt = (req.resourceType || '').toLowerCase()
    const mime = (req.mimeType || '').toLowerCase()
    if (!rt.includes('xhr') && !rt.includes('fetch') && !mime.includes('json') && !mime.includes('xml')) return false
  } else if (typeFilter === 'DOC') {
    const rt = (req.resourceType || '').toLowerCase()
    const mime = (req.mimeType || '').toLowerCase()
    if (!rt.includes('document') && !mime.includes('html')) return false
  } else if (typeFilter === 'STATIC') {
    if (!isStaticUrl(req.url)) return false
  } else if (typeFilter === 'FAILED') {
    if (!req.error && (!req.responseStatus || req.responseStatus < 400)) return false
  }
  return true
}

export function filterRequests(requests: RecordedRequest[], f: RequestFilterState): RecordedRequest[] {
  return requests.filter((req) => {
    if (f.hideStatic && isStaticUrl(req.url)) return false
    if (f.hideAnalytics && isAnalyticsUrl(req.url)) return false
    if (f.methodFilter !== 'ALL' && req.method !== f.methodFilter) return false
    if (!matchesType(req, f.typeFilter)) return false

    if (f.searchText.trim()) {
      const query = f.searchText.toLowerCase()
      const matchUrl = req.url.toLowerCase().includes(query)
      const matchPath = req.path.toLowerCase().includes(query)
      const matchTx = req.transaction.toLowerCase().includes(query)
      if (!matchUrl && !matchPath && !matchTx) return false
    }
    return true
  })
}

export function areAllSelected(filtered: RecordedRequest[], selectedIds: Set<string>): boolean {
  return filtered.every((r) => selectedIds.has(r.id))
}

export function pickSelected(filtered: RecordedRequest[], selectedIds: Set<string>): RecordedRequest[] {
  return filtered.filter((r) => selectedIds.has(r.id))
}

export function estimateSummary(selected: RecordedRequest[], o: ImportOptionFlags): string {
  if (selected.length === 0) return '0 nodes'

  const txSet = new Set(selected.map((r) => r.transaction || 'Default'))
  const parts: string[] = []
  if (o.createDefaults) parts.push('1 Defaults')
  if (o.groupByTx) parts.push(`${txSet.size} Transaction Controller${txSet.size > 1 ? 's' : ''}`)
  parts.push(`${selected.length} HTTP Request${selected.length > 1 ? 's' : ''}`)
  if (o.createHeaderMgr) parts.push(`${selected.length} Header Manager${selected.length > 1 ? 's' : ''}`)
  if (o.createCookieMgr) parts.push('1 Cookie Manager')
  if (o.parameterizeSecrets) parts.push('1 UDV (Secrets)')

  return parts.join(' + ')
}

export function buildConversionOptions(o: ImportOptionFlags): ConversionOptions {
  return {
    groupByTransaction: o.groupByTx,
    createHeaderManager: o.createHeaderMgr,
    createCookieManager: o.createCookieMgr,
    createDefaults: o.createDefaults,
    cleanRedundantHeaders: o.cleanHeaders,
    maskSensitive: o.maskSensitive,
    parameterizeSecrets: o.parameterizeSecrets,
    customNaming: 'index-method-path',
  }
}

function primaryRouteKey(url: string): string {
  let toParse = url
  if (!/^https?:\/\//i.test(toParse)) toParse = `https://${toParse}`
  const u = new URL(toParse)
  const segments = u.pathname.split('/').filter(Boolean)
  if (segments.length >= 2) return `/${segments[0]}/${segments[1]}`
  if (segments.length === 1) return `/${segments[0]}`
  return '/home'
}

export function groupRequestsByRoute(requests: RecordedRequest[]): RecordedRequest[] {
  const routesMap = new Map<string, string>()
  let stepIdx = 1

  return requests.map((r) => {
    try {
      const primaryKey = primaryRouteKey(r.url)
      if (!routesMap.has(primaryKey)) {
        const cleanName = primaryKey.replace(/^\/|\/$/g, '').replace(/[/_.-]+/g, '_') || 'home'
        routesMap.set(primaryKey, `${String(stepIdx++).padStart(2, '0')}_Page_${cleanName}`)
      }
      return { ...r, transaction: routesMap.get(primaryKey)! }
    } catch {
      return r
    }
  })
}

export function methodColor(method: string): string {
  if (method === 'POST') return '#fbbf24'
  if (method === 'GET') return '#34d399'
  if (method === 'DELETE') return '#f87171'
  if (method === 'PUT') return '#60a5fa'
  return '#c084fc'
}

export function statusColor(status?: number): string {
  if (!status) return '#94a3b8'
  if (status < 300) return '#10b981'
  if (status < 400) return '#38bdf8'
  if (status < 500) return '#fbbf24'
  return '#ef4444'
}

export function inspectorTabLabel(t: InspectorTab, req: RecordedRequest): string {
  if (t === 'body') return `Body (${req.postData || req.postParams ? 'Payload' : 'Empty'})`
  if (t === 'headers') return `Headers (${req.requestHeaders.length})`
  if (t === 'query') return `Query (${req.queryParams?.length || 0})`
  if (t === 'response') return 'Response'
  return `Security (${req.sensitiveFields?.length || 0})`
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}
