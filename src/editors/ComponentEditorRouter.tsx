import { AlertTriangle } from 'lucide-react'
import { componentMeta } from '../components/componentMeta'
import type { TestPlanNode } from '../models/jmeter'
import { ComponentHeader } from './ComponentHeader'
import { CSVDataSetEditor, HTTPCookieManagerEditor, HTTPHeaderManagerEditor } from './ConfigEditors'
import { HTTPRequestDefaultsEditor, HTTPRequestEditor, TestPlanEditor, ThreadGroupEditor, UserDefinedVariablesEditor } from './CoreEditors'
import { AggregateReportEditor, SummaryReportEditor, ViewResultsTreeEditor } from './ListenerEditors'
import { ConstantTimerEditor, IfControllerEditor, LoopControllerEditor, TransactionControllerEditor } from './LogicEditors'
import { JSONExtractorEditor, JSR223Editor, RegexExtractorEditor, ResponseAssertionEditor } from './ProcessorEditors'

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
      case 'HTTPRequest': return <HTTPRequestEditor key={node.id} {...props} />
      case 'HTTPRequestDefaults': return <HTTPRequestDefaultsEditor {...props} />
      case 'HTTPHeaderManager': return <HTTPHeaderManagerEditor {...props} />
      case 'HTTPCookieManager': return <HTTPCookieManagerEditor {...props} />
      case 'CSVDataSet': return <CSVDataSetEditor {...props} />
      case 'TransactionController': return <TransactionControllerEditor {...props} />
      case 'IfController': return <IfControllerEditor {...props} />
      case 'LoopController': return <LoopControllerEditor {...props} />
      case 'ConstantTimer': return <ConstantTimerEditor {...props} />
      case 'JSONExtractor': return <JSONExtractorEditor {...props} />
      case 'RegexExtractor': return <RegexExtractorEditor {...props} />
      case 'ResponseAssertion': return <ResponseAssertionEditor {...props} />
      case 'JSR223Sampler':
      case 'JSR223PreProcessor':
      case 'JSR223PostProcessor':
      case 'JSR223Assertion': return <JSR223Editor {...props} />
      case 'ViewResultsTree': return <ViewResultsTreeEditor cleared={resultsCleared} />
      case 'SummaryReport': return <SummaryReportEditor cleared={resultsCleared} />
      case 'AggregateReport': return <AggregateReportEditor cleared={resultsCleared} />
      case 'UnsupportedComponent':
        return (
          <div className="unsupported-editor">
            <AlertTriangle size={24} />
            <div>
              <h3>Unsupported JMeter Component</h3>
              <p><strong>Class:</strong> {node.metadata?.originalClass ?? 'Unknown'}</p>
              <p>This component is preserved in the test plan and exported unchanged, but its properties cannot yet be edited.</p>
            </div>
          </div>
        )
    }
  })()

  return (
    <section className="editor-panel" aria-label={`${componentMeta[node.type].label} editor`}>
      <div className="editor-titlebar">
        <Icon size={18} className={`tone-${componentMeta[node.type].tone}`} />
        <div><strong>{componentMeta[node.type].label}</strong><span>{node.type}</span></div>
      </div>
      <div className="editor-scroll">
        <ComponentHeader node={node} onUpdateNode={updateNode} onUpdateProperties={updateProperties} />
        <div className="editor-body">{editor}</div>
      </div>
    </section>
  )
}
