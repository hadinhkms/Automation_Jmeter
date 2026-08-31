import {
  CheckboxField,
  FormField,
  Section,
  TextAreaField,
} from '../components/common/FormControls'
import type { EditorProps } from './editorUtils'
import { boolProp, numberProp, textProp } from './editorUtils'

export function TransactionControllerEditor({ node, updateProperties }: EditorProps) {
  return (
    <Section title="Transaction Controller Settings">
      <div className="checkbox-stack">
        <CheckboxField label="Generate parent sample" checked={boolProp(node, 'generateParent')} onChange={(generateParent) => updateProperties({ generateParent })} />
        <CheckboxField label="Include duration of timer and pre-post processors" checked={boolProp(node, 'includeTimers')} onChange={(includeTimers) => updateProperties({ includeTimers })} />
      </div>
    </Section>
  )
}

export function IfControllerEditor({ node, updateProperties }: EditorProps) {
  return (
    <Section title="If Controller Settings">
      <TextAreaField label="Condition" rows={4} monospace value={textProp(node, 'condition')} placeholder={'${JMeterThread.last_sample_ok}'} onChange={(condition) => updateProperties({ condition })} />
      <div className="checkbox-stack">
        <CheckboxField label="Interpret Condition as Variable Expression" checked={boolProp(node, 'interpretExpression', true)} onChange={(interpretExpression) => updateProperties({ interpretExpression })} />
        <CheckboxField label="Evaluate for all children" checked={boolProp(node, 'evaluateAll')} onChange={(evaluateAll) => updateProperties({ evaluateAll })} />
      </div>
    </Section>
  )
}

export function LoopControllerEditor({ node, updateProperties }: EditorProps) {
  const forever = boolProp(node, 'forever')
  const loops = numberProp(node, 'loops', 1)
  return (
    <Section title="Loop Controller Settings">
      <div className="compact-form-row">
        <FormField label="Loop Count" type="number" min={1} value={textProp(node, 'loops', '1')} error={!forever && loops < 1 ? 'Must be at least 1' : undefined} onChange={(value) => updateProperties({ loops: value === '' ? '' : Number(value) })} />
        <CheckboxField label="Forever" checked={forever} onChange={(value) => updateProperties({ forever: value })} />
      </div>
    </Section>
  )
}

export function ConstantTimerEditor({ node, updateProperties }: EditorProps) {
  const delay = numberProp(node, 'delay')
  return (
    <Section title="Thread Delay">
      <FormField label="Thread Delay (milliseconds)" type="number" min={0} value={textProp(node, 'delay', '0')} error={delay < 0 ? 'Cannot be negative' : undefined} onChange={(value) => updateProperties({ delay: value === '' ? '' : Number(value) })} />
    </Section>
  )
}
