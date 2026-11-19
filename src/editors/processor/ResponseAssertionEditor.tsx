import { EditableTable } from '../../components/common/EditableTable'
import { CheckboxField, RadioGroup, Section, SelectField } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { boolProp, rowsProp, textProp } from '../editorUtils'

export function ResponseAssertionEditor({ node, updateProperties }: EditorProps) {
  return (
    <>
      <Section title="Response Field to Test">
        <div className="form-grid two-columns">
          <SelectField
            label="Apply to"
            value={textProp(node, 'applyTo', 'main-and-sub')}
            options={[
              { value: 'main-and-sub', label: 'Main sample and sub-samples' },
              { value: 'main', label: 'Main sample only' },
              { value: 'sub', label: 'Sub-samples only' },
              { value: 'variable', label: 'JMeter Variable' },
            ]}
            onChange={(applyTo) => updateProperties({ applyTo })}
          />
          <SelectField
            label="Field to test"
            value={textProp(node, 'field', 'response-code')}
            options={[
              { value: 'text', label: 'Text Response' },
              { value: 'response-code', label: 'Response Code' },
              { value: 'response-message', label: 'Response Message' },
              { value: 'response-headers', label: 'Response Headers' },
              { value: 'request-headers', label: 'Request Headers' },
              { value: 'url', label: 'URL Sampled' },
              { value: 'document', label: 'Document' },
            ]}
            onChange={(field) => updateProperties({ field })}
          />
        </div>
        <RadioGroup
          legend="Pattern Matching Rules"
          value={textProp(node, 'matchType', 'equals')}
          options={[
            { value: 'contains', label: 'Contains' },
            { value: 'matches', label: 'Matches' },
            { value: 'equals', label: 'Equals' },
            { value: 'substring', label: 'Substring' },
          ]}
          onChange={(matchType) => updateProperties({ matchType })}
        />
      </Section>
      <Section title="Patterns to Test">
        <EditableTable columns={[{ key: 'pattern', label: 'Pattern' }]} rows={rowsProp(node, 'patterns')} newRow={{ pattern: '' }} onChange={(patterns) => updateProperties({ patterns })} />
        <div className="checkbox-stack inline-checks">
          <CheckboxField label="Not" checked={boolProp(node, 'not')} onChange={(value) => updateProperties({ not: value })} />
          <CheckboxField label="Or" checked={boolProp(node, 'or')} onChange={(value) => updateProperties({ or: value })} />
          <CheckboxField label="Ignore Status" checked={boolProp(node, 'ignoreStatus')} onChange={(ignoreStatus) => updateProperties({ ignoreStatus })} />
        </div>
      </Section>
    </>
  )
}
