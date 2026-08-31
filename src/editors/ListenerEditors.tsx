import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { aggregateRows, mockSamples, summaryRows } from '../mock/sampleResults'

export function ViewResultsTreeEditor({ cleared = false }: { cleared?: boolean }) {
  const [selectedId, setSelectedId] = useState(mockSamples[0].id)
  const [tab, setTab] = useState<'result' | 'request' | 'response'>('result')
  const sample = mockSamples.find((item) => item.id === selectedId) ?? mockSamples[0]

  if (cleared) return <div className="listener-empty">No samples to display. Start a mock run to generate results.</div>

  return (
    <div className="results-tree-view">
      <div className="samples-pane">
        <div className="listener-pane-heading">Samples</div>
        <div className="sample-list">
          {mockSamples.map((item) => (
            <button key={item.id} type="button" className={item.id === selectedId ? 'selected' : ''} onClick={() => setSelectedId(item.id)}>
              {item.success ? <CheckCircle2 size={15} className="success-icon" /> : <XCircle size={15} className="failure-icon" />}
              <span>{item.label}</span>
              <code>{item.code}</code>
              <small>{item.elapsed} ms</small>
            </button>
          ))}
        </div>
      </div>
      <div className="sample-detail-pane">
        <div className="listener-pane-heading">Selected Sample Detail</div>
        <div className="tab-list" role="tablist">
          {([
            ['result', 'Sampler Result'],
            ['request', 'Request'],
            ['response', 'Response Data'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>
          ))}
        </div>
        <div className="sample-detail-content">
          {tab === 'result' ? (
            <dl className="result-properties">
              <div><dt>Thread Name</dt><dd>Thread Group - Login Load Test 1-42</dd></div>
              <div><dt>Sample Start</dt><dd>2026-08-31 09:44:21 ICT</dd></div>
              <div><dt>Load time</dt><dd>{sample.elapsed} ms</dd></div>
              <div><dt>Connect Time</dt><dd>41 ms</dd></div>
              <div><dt>Latency</dt><dd>78 ms</dd></div>
              <div><dt>Response code</dt><dd>{sample.code}</dd></div>
              <div><dt>Response message</dt><dd>{sample.success ? 'OK' : 'Internal Server Error'}</dd></div>
              <div><dt>URL</dt><dd>{sample.url}</dd></div>
            </dl>
          ) : (
            <pre className="payload-view">{tab === 'request' ? sample.request : sample.response}</pre>
          )}
        </div>
      </div>
    </div>
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
  if (cleared) return <div className="listener-empty">No summary data. Start a mock run to generate results.</div>
  return (
    <div className="listener-report">
      <div className="report-toolbar"><span>Mock run snapshot</span><strong>2,000 samples</strong></div>
      <ReportTable columns={['Label', '# Samples', 'Average', 'Min', 'Max', 'Std. Dev.', 'Error %', 'Throughput', 'Received KB/sec', 'Sent KB/sec', 'Avg. Bytes']} rows={summaryRows} />
    </div>
  )
}

export function AggregateReportEditor({ cleared = false }: { cleared?: boolean }) {
  if (cleared) return <div className="listener-empty">No aggregate data. Start a mock run to generate results.</div>
  return (
    <div className="listener-report">
      <div className="report-toolbar"><span>Mock run aggregate</span><strong>330.2 req/s</strong></div>
      <ReportTable columns={['Label', '# Samples', 'Average', 'Median', '90% Line', '95% Line', '99% Line', 'Min', 'Max', 'Error %', 'Throughput', 'Received KB/sec', 'Sent KB/sec']} rows={aggregateRows} />
    </div>
  )
}
