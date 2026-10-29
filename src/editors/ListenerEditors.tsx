import { useMemo } from 'react'
import { mockSamples } from '../mock/sampleResults'
import { useJMeterStore } from '../store/jmeterStore'
import { ViewResultsTree } from '../components/results/ViewResultsTree'

export { ReportTable, SummaryReportEditor, AggregateReportEditor } from './ReportEditors'

export function ViewResultsTreeEditor({ cleared = false }: { cleared?: boolean }) {
  const store = useJMeterStore()
  const hasRealRun = store.realSamples.length > 0 || Boolean(store.activeRunId)
  const rawSamples = useMemo(() => {
    if (store.realSamples.length > 0) return store.realSamples
    return hasRealRun ? [] : mockSamples
  }, [store.realSamples, hasRealRun])
  const isReal = hasRealRun

  const samples = useMemo(
    () =>
      rawSamples.map((s, idx) => ({
        id: s.id || `sample-${idx}`,
        label: s.label || 'Sample',
        code: s.code || 200,
        elapsed: s.elapsed || 0,
        success: Boolean(s.success),
        method: s.method || 'HTTP',
        url: s.url || '',
        request: s.request || '',
        response: s.response || '',
        threadName: s.threadName || 'Thread Group 1-1',
        timestamp: s.timestamp || '',
        bytes: s.bytes || 0,
        sentBytes: s.sentBytes || 0,
        latency: s.latency || 0,
        connectTime: s.connectTime || 0,
        requestHeaders: s.requestHeaders,
        responseHeaders: s.responseHeaders,
      })),
    [rawSamples]
  )

  if (cleared || (!hasRealRun && rawSamples.length === 0)) {
    return <div className="listener-empty">No samples to display. Start a test run to generate results.</div>
  }

  return (
    <ViewResultsTree
      samples={samples}
      isReal={isReal}
      activeRunId={store.activeRunId}
    />
  )
}
