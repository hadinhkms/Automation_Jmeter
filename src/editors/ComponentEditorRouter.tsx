import { AlertTriangle } from 'lucide-react'
import { EditableTable } from '../components/common/EditableTable'
import { componentMeta } from '../components/componentMeta'
import type { TableRow, TestPlanNode } from '../models/jmeter'
import { applyRawJmxProperties, parseRawJmxProperties } from '../utils/jmxRawProperties'
import { ComponentHeader } from './ComponentHeader'
import { CSVDataSetEditor, HTTPCookieManagerEditor, HTTPHeaderManagerEditor } from './ConfigEditors'
import { DebugSamplerEditor, HTTPRequestDefaultsEditor, HTTPRequestEditor, TestPlanEditor, ThreadGroupEditor, UserDefinedVariablesEditor } from './CoreEditors'
import { AggregateReportEditor, SummaryReportEditor, ViewResultsTreeEditor } from './ListenerEditors'
import { ConstantTimerEditor, IfControllerEditor, LoopControllerEditor, TransactionControllerEditor } from './LogicEditors'
import { JSONExtractorEditor, JSR223Editor, RegexExtractorEditor, ResponseAssertionEditor } from './ProcessorEditors'
import { ConcurrencyThreadGroupEditor, SteppingThreadGroupEditor, UltimateThreadGroupEditor } from './ThreadEditors'
import { BackendListenerEditor, GraphQLSamplerEditor, WebSocketCloseSamplerEditor, WebSocketOpenSamplerEditor, WebSocketSingleReadSamplerEditor, WebSocketSingleWriteSamplerEditor } from './ProtocolEditors'

function UnsupportedComponentEditor({
  node,
  updateNode,
  updateProperties,
}: {
  node: TestPlanNode
  updateNode: (updates: Partial<TestPlanNode>) => void
  updateProperties: (updates: Record<string, unknown>) => void
}) {
  const rawXml = node.metadata?.rawXml || ''
  const rows: TableRow[] = Array.isArray(node.properties.rawProperties)
    ? node.properties.rawProperties as TableRow[]
    : parseRawJmxProperties(rawXml)

  const handleRowsChange = (rawProperties: TableRow[]) => {
    const nextRawXml = rawXml ? applyRawJmxProperties(rawXml, rawProperties) : rawXml
    updateProperties({ rawProperties })
    if (nextRawXml && nextRawXml !== rawXml) {
      updateNode({ metadata: { ...node.metadata, rawXml: nextRawXml } })
    }
  }

  return (
    <div className="unsupported-editor">
      <AlertTriangle size={24} />
      <div className="unsupported-editor-content">
        <h3>Unsupported JMeter Component</h3>
        <p><strong>Class:</strong> {node.metadata?.originalClass ?? 'Unknown'}</p>
        <p>This component is preserved in the test plan. You can edit its raw JMeter properties below.</p>
        <EditableTable
          columns={[
            { key: 'type', label: 'Type', minWidth: 110 },
            { key: 'name', label: 'Property', minWidth: 180 },
            { key: 'value', label: 'Value', minWidth: 220 },
          ]}
          rows={rows}
          newRow={{ rawPath: '', type: 'stringProp', name: '', value: '' }}
          onChange={handleRowsChange}
          compact
        />
      </div>
    </div>
  )
}

export function ComponentEditorRouter({
  node,
  updateNode,
  updateProperties,
  resultsCleared = false,
}: {
  node: TestPlanNode
  updateNode: (updates: Partial<TestPlanNode>) => void
  updateProperties: (updates: Record<string, unknown>) => void
  resultsCleared?: boolean
}) {
  const props = { node, updateProperties }
  const Icon = componentMeta[node.type].icon

  const editor = (() => {
    switch (node.type) {
      case 'TestPlan': return <TestPlanEditor {...props} />
      case 'UserDefinedVariables': return <UserDefinedVariablesEditor {...props} />
      case 'ThreadGroup': return <ThreadGroupEditor {...props} />
      case 'ConcurrencyThreadGroup': return <ConcurrencyThreadGroupEditor {...props} />
      case 'SteppingThreadGroup': return <SteppingThreadGroupEditor {...props} />
      case 'UltimateThreadGroup': return <UltimateThreadGroupEditor {...props} />
      case 'HTTPRequest': return <HTTPRequestEditor key={node.id} {...props} />
      case 'GraphQLSampler': return <GraphQLSamplerEditor key={node.id} {...props} />
      case 'WebSocketOpenSampler': return <WebSocketOpenSamplerEditor key={node.id} {...props} />
      case 'WebSocketSingleWriteSampler': return <WebSocketSingleWriteSamplerEditor key={node.id} {...props} />
      case 'WebSocketSingleReadSampler': return <WebSocketSingleReadSamplerEditor key={node.id} {...props} />
      case 'WebSocketCloseSampler': return <WebSocketCloseSamplerEditor key={node.id} {...props} />
      case 'HTTPRequestDefaults': return <HTTPRequestDefaultsEditor {...props} />
      case 'DebugSampler': return <DebugSamplerEditor key={node.id} {...props} />
      case 'HTTPHeaderManager': return <HTTPHeaderManagerEditor {...props} />
      case 'HTTPCookieManager': return <HTTPCookieManagerEditor {...props} />
      case 'CSVDataSet': return <CSVDataSetEditor {...props} />
      case 'TransactionController': return <TransactionControllerEditor {...props} />
      case 'IfController': return <IfControllerEditor {...props} />
      case 'LoopController': return <LoopControllerEditor {...props} />
      case 'ModuleController':
      case 'TestFragmentController': return <div className="editor-empty-state">No specific configuration required for this controller container.</div>
      case 'ConstantTimer': return <ConstantTimerEditor {...props} />
      case 'JSONExtractor': return <JSONExtractorEditor {...props} />
      case 'RegexExtractor': return <RegexExtractorEditor {...props} />
      case 'ResponseAssertion': return <ResponseAssertionEditor {...props} />
      case 'JSR223Sampler':
      case 'JSR223PreProcessor':
      case 'JSR223PostProcessor':
      case 'JSR223Assertion': return <JSR223Editor {...props} />
      case 'BeanShellPostProcessor': return <JSR223Editor {...props} />
      case 'BackendListener': return <BackendListenerEditor {...props} />
      case 'ViewResultsTree': return <ViewResultsTreeEditor cleared={resultsCleared} />
      case 'SummaryReport': return <SummaryReportEditor cleared={resultsCleared} />
      case 'AggregateReport': return <AggregateReportEditor cleared={resultsCleared} />
      case 'UnsupportedComponent':
        return <UnsupportedComponentEditor node={node} updateNode={updateNode} updateProperties={updateProperties} />
    }
  })()

  const isFullHeightListener = ['ViewResultsTree', 'SummaryReport', 'AggregateReport'].includes(node.type)

  return (
    <section className={`editor-panel ${isFullHeightListener ? 'panel-full-height' : ''}`} aria-label={`${componentMeta[node.type].label} editor`}>
      <div className="editor-titlebar">
        <Icon size={18} className={`tone-${componentMeta[node.type].tone}`} />
        <div><strong>{componentMeta[node.type].label}</strong><span>{node.type}</span></div>
      </div>
      <div className={`editor-scroll ${isFullHeightListener ? 'full-height-listener' : ''}`}>
        <ComponentHeader node={node} onUpdateNode={updateNode} onUpdateProperties={updateProperties} />
        <div className={`editor-body ${isFullHeightListener ? 'full-height-listener' : ''}`}>{editor}</div>
      </div>
    </section>
  )
}
