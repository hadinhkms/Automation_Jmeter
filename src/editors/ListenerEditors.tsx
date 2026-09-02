import { ExternalLink } from 'lucide-react'
import { aggregateRows as mockAggregateRows, mockSamples, summaryRows as mockSummaryRows } from '../mock/sampleResults'
import { useJMeterStore } from '../store/jmeterStore'
import { jmeterRunnerService } from '../services/jmeterRunnerService'


import { ViewResultsTree } from '../components/results/ViewResultsTree'

export function ViewResultsTreeEditor({ cleared = false }: { cleared?: boolean }) {
  const store = useJMeterStore()
  const hasRealRun = store.realSamples.length > 0 || Boolean(store.activeRunId)
  const rawSamples = store.realSamples.length > 0 ? store.realSamples : hasRealRun ? [] : mockSamples
  const isReal = hasRealRun

  if (cleared || (!hasRealRun && rawSamples.length === 0)) {
    return <div className="listener-empty">No samples to display. Start a test run to generate results.</div>
  }

  const samples = rawSamples.map((s, idx) => ({
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
  }))

  return (
    <ViewResultsTree
      samples={samples}
      isReal={isReal}
      activeRunId={store.activeRunId}
    />
  )
}



function ReportTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className={row[0] === 'TOTAL' ? 'total-row' : ''}>
              {row.map((cell, index) => <td key={`${row[0]}-${columns[index]}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SummaryReportEditor({ cleared = false }: { cleared?: boolean }) {
  const store = useJMeterStore()
  const hasRealRun = store.realSummaryRows.length > 0 || Boolean(store.activeRunId)
  const rows = store.realSummaryRows.length > 0 ? store.realSummaryRows : hasRealRun ? [] : mockSummaryRows
  const isReal = hasRealRun

  if (cleared || rows.length === 0) {
    return <div className="listener-empty">No summary data. Start a test run to generate results.</div>
  }

  return (
    <div className="listener-report">
      <div className="report-toolbar">
        <div>
          <span>{isReal ? 'JMeter CLI Execution Summary' : 'Mock run snapshot'}</span>
          {isReal ? <span className="source-badge">Live JTL</span> : null}
        </div>
        <div className="report-toolbar-right">
          <strong>{store.metrics.samples.toLocaleString()} samples</strong>
          {store.hasHtmlReport && store.activeRunId ? (
            <button
              type="button"
              className="text-button"
              onClick={() => window.open(jmeterRunnerService.getReportUrl(store.activeRunId || undefined), '_blank')}
            >
              <ExternalLink size={13} />
              <span>HTML Dashboard Report</span>
            </button>
          ) : null}
        </div>
      </div>
      <ReportTable columns={['Label', '# Samples', 'Average', 'Min', 'Max', 'Std. Dev.', 'Error %', 'Throughput', 'Received KB/sec', 'Sent KB/sec', 'Avg. Bytes']} rows={rows} />
    </div>
  )
}

export function AggregateReportEditor({ cleared = false }: { cleared?: boolean }) {
  const store = useJMeterStore()
  const hasRealRun = store.realAggregateRows.length > 0 || Boolean(store.activeRunId)
  const rows = store.realAggregateRows.length > 0 ? store.realAggregateRows : hasRealRun ? [] : mockAggregateRows
  const isReal = hasRealRun

  if (cleared || rows.length === 0) {
    return <div className="listener-empty">No aggregate data. Start a test run to generate results.</div>
  }

  return (
    <div className="listener-report">
      <div className="report-toolbar">
        <div>
          <span>{isReal ? 'JMeter CLI Aggregate Stats' : 'Mock run aggregate'}</span>
          {isReal ? <span className="source-badge">Live JTL</span> : null}
        </div>
        <div className="report-toolbar-right">
          <strong>{store.metrics.throughput.toFixed(1)} req/s</strong>
          {store.hasHtmlReport && store.activeRunId ? (
            <button
              type="button"
              className="text-button"
              onClick={() => window.open(jmeterRunnerService.getReportUrl(store.activeRunId || undefined), '_blank')}
            >
              <ExternalLink size={13} />
              <span>HTML Dashboard Report</span>
            </button>
          ) : null}
        </div>
      </div>
      <ReportTable columns={['Label', '# Samples', 'Average', 'Median', '90% Line', '95% Line', '99% Line', 'Min', 'Max', 'Error %', 'Throughput', 'Received KB/sec', 'Sent KB/sec']} rows={rows} />
    </div>
  )
}
