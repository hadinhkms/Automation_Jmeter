import { useState } from 'react'
import type { TestPlanNode } from '../../../models/jmeter'
import { proxyDebugService, type SingleResponseResult } from '../../../services/proxyDebugService'
import { historyStorageService } from '../../../services/historyStorageService'
import { useEnvironmentStore } from '../../../store/environmentStore'
import { useJMeterStore } from '../../../store/jmeterStore'
import { buildDebugRequest, type DebugRequest } from '../../../utils/debug/buildDebugRequest'
import { createId } from '../../../utils/ids'

function clientError(err: unknown): SingleResponseResult {
  return {
    status: 0,
    statusText: 'Client Error',
    latencyMs: 0,
    sizeBytes: 0,
    headers: [],
    body: err instanceof Error ? err.message : String(err),
    truncated: false,
  }
}

function recordHistory(node: TestPlanNode, request: DebugRequest, result: SingleResponseResult) {
  historyStorageService
    .add({
      id: createId(),
      timestamp: Date.now(),
      nodeId: node.id,
      nodeName: node.name,
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      status: result.status,
      statusText: result.statusText,
      latencyMs: result.latencyMs,
      sizeBytes: result.sizeBytes,
    })
    .catch(() => {
      // History is best-effort; a storage failure must not break Send Request.
    })
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
      const request = buildDebugRequest(node, useJMeterStore.getState().testPlan, envVars)
      const result = await proxyDebugService.sendSingleRequest(request)
      setDebugResult(result)
      recordHistory(node, request, result)
    } catch (err: unknown) {
      setDebugResult(clientError(err))
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
