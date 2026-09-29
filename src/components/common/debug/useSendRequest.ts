import { useState } from 'react'
import type { TableRow, TestPlanNode } from '../../../models/jmeter'
import { proxyDebugService, type SingleResponseResult } from '../../../services/proxyDebugService'
import { useEnvironmentStore } from '../../../store/environmentStore'
import { resolveVariables } from '../../../utils/postman/dynamicVariablesEngine'

function textProp(node: TestPlanNode, key: string): string {
  const val = node.properties[key]
  return val !== undefined && val !== null ? String(val) : ''
}

function rowsProp(node: TestPlanNode, key: string): TableRow[] {
  const current = node.properties[key]
  return Array.isArray(current) ? (current as TableRow[]) : []
}

export function useSendRequest(node: TestPlanNode) {
  const [isSending, setIsSending] = useState(false)
  const [debugResult, setDebugResult] = useState<SingleResponseResult | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const sendRequest = async () => {
    setIsSending(true)
    setIsPanelOpen(true)

    try {
      const envVars = useEnvironmentStore.getState().getActiveVariables()

      let rawProtocol = resolveVariables(textProp(node, 'protocol') || 'https', envVars).trim()
      let rawDomain = resolveVariables(textProp(node, 'domain') || textProp(node, 'server'), envVars).trim()
      const rawPort = resolveVariables(textProp(node, 'port'), envVars).trim()
      let rawPath = resolveVariables(textProp(node, 'path') || '/', envVars).trim()
      const method = (textProp(node, 'method') || 'GET').toUpperCase()
      const rawBody = resolveVariables(textProp(node, 'body') || '', envVars)

      // Handle if domain contains full url like https://domain.com
      if (/^https?:\/\//i.test(rawDomain)) {
        try {
          const parsed = new URL(rawDomain)
          rawProtocol = parsed.protocol.replace(':', '')
          rawDomain = parsed.hostname
          if (parsed.port) rawDomain += `:${parsed.port}`
          if (parsed.pathname && parsed.pathname !== '/') {
            rawPath = `${parsed.pathname}${rawPath === '/' ? '' : rawPath}`
          }
        } catch {
          // ignore parse error
        }
      }

      // Query params
      const params = rowsProp(node, 'parameters')
      let queryString = ''
      if (params.length > 0) {
        const validParams = params.filter((p) => p.name)
        if (validParams.length > 0) {
          queryString =
            (rawPath.includes('?') ? '&' : '?') +
            validParams
              .map(
                (p) =>
                  `${encodeURIComponent(resolveVariables(String(p.name), envVars))}=${encodeURIComponent(
                    resolveVariables(String(p.value || ''), envVars),
                  )}`,
              )
              .join('&')
        }
      }

      const portSegment = rawPort ? `:${rawPort}` : ''
      const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
      const fullUrl = `${rawProtocol}://${rawDomain}${portSegment}${normalizedPath}${queryString}`

      // Extract headers from child HeaderManager if present
      const headers: Array<{ name: string; value: string }> = []
      const headerManager = node.children.find((c) => c.type === 'HTTPHeaderManager')
      if (headerManager) {
        const headerRows = rowsProp(headerManager, 'headers')
        for (const h of headerRows) {
          if (h.name) {
            headers.push({
              name: resolveVariables(String(h.name), envVars),
              value: resolveVariables(String(h.value || ''), envVars),
            })
          }
        }
      }

      if (rawBody && !headers.some((h) => h.name.toLowerCase() === 'content-type')) {
        headers.push({ name: 'Content-Type', value: 'application/json' })
      }

      const result = await proxyDebugService.sendSingleRequest({
        method,
        url: fullUrl,
        headers,
        body: rawBody || undefined,
        timeoutMs: 30000,
      })

      setDebugResult(result)
    } catch (err: unknown) {
      setDebugResult({
        status: 0,
        statusText: 'Client Error',
        latencyMs: 0,
        sizeBytes: 0,
        headers: [],
        body: err instanceof Error ? err.message : String(err),
        truncated: false,
      })
    } finally {
      setIsSending(false)
    }
  }

  const closePanel = () => {
    setIsPanelOpen(false)
  }

  return {
    isSending,
    debugResult,
    isPanelOpen,
    sendRequest,
    closePanel,
  }
}
