// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { EditableTable } from '../components/common/EditableTable'
import {
  ApplyToPanel,
  CheckboxField,
  FormField,
  RadioGroup,
  Section,
  SelectField,
} from '../components/common/FormControls'

import type { EditorProps } from './editorUtils'
import { boolProp, numberProp, rowsProp, textProp } from './editorUtils'

export function JSONExtractorEditor({ node, updateProperties }: EditorProps) {
  const scope = textProp(node, 'scope', textProp(node, 'applyTo', 'main'))
  const scopeVariable = textProp(node, 'scopeVariable')

  return (
    <div className="json-extractor-editor">
      <ApplyToPanel
        value={scope}
        variableName={scopeVariable}
        onValueChange={(newScope) => updateProperties({ scope: newScope, applyTo: newScope })}
        onVariableNameChange={(newVar) => updateProperties({ scopeVariable: newVar })}
      />
      <div className="json-extractor-fields">
        <FormField
          label="Names of created variables:"
          value={textProp(node, 'variableNames')}
          placeholder="pathFile"
          onChange={(variableNames) => updateProperties({ variableNames })}
        />
        <FormField
          label="JSON Path expressions:"
          value={textProp(node, 'jsonPaths')}
          placeholder="$.data.path_file"
          onChange={(jsonPaths) => updateProperties({ jsonPaths })}
        />
        <FormField
          label="Match No. (0 for Random):"
          value={textProp(node, 'matchNumbers', '1')}
          placeholder="1"
          onChange={(matchNumbers) => updateProperties({ matchNumbers })}
        />
        <div className="json-extractor-checkbox-row">
          <CheckboxField
            label="Compute concatenation var (suffix _ALL)"
            checked={boolProp(node, 'computeConcat')}
            onChange={(computeConcat) => updateProperties({ computeConcat })}
          />
        </div>
        <FormField
          label="Default Values:"
          value={textProp(node, 'defaults')}
          placeholder="NOT_FOUND"
          onChange={(defaults) => updateProperties({ defaults })}
        />
      </div>
    </div>
  )
}

export function RegexExtractorEditor({ node, updateProperties }: EditorProps) {
  const matchNumber = numberProp(node, 'matchNumber', 1)
  const scope = textProp(node, 'scope', textProp(node, 'applyTo', 'main'))
  const scopeVariable = textProp(node, 'scopeVariable')

  return (
    <>
      <ApplyToPanel
        value={scope}
        variableName={scopeVariable}
        onValueChange={(newScope) => updateProperties({ scope: newScope, applyTo: newScope })}
        onVariableNameChange={(newVar) => updateProperties({ scopeVariable: newVar })}
      />
      <Section title="Regular Expression Extraction">
        <div className="form-grid two-columns">
          <SelectField
            label="Field to check"
            value={textProp(node, 'field', 'body')}
            options={[
              { value: 'body', label: 'Body' },
              { value: 'body-unescaped', label: 'Body (unescaped)' },
              { value: 'headers', label: 'Response Headers' },
              { value: 'request-headers', label: 'Request Headers' },
              { value: 'url', label: 'URL' },
              { value: 'code', label: 'Response Code' },
              { value: 'message', label: 'Response Message' },
              { value: 'document', label: 'Body as a Document' },
            ]}
            onChange={(field) => updateProperties({ field })}
          />
          <FormField label="Reference Name" value={textProp(node, 'referenceName')} onChange={(referenceName) => updateProperties({ referenceName })} />
          <FormField label="Regular Expression" value={textProp(node, 'regex')} placeholder={'"id"\\s*:\\s*"([^"]+)"'} onChange={(regex) => updateProperties({ regex })} />
          <FormField label="Template" value={textProp(node, 'template', '$1$')} onChange={(template) => updateProperties({ template })} />
          <FormField label="Match Number" type="number" value={textProp(node, 'matchNumber', '1')} error={matchNumber < -1 ? 'Use -1, 0, or a positive number' : undefined} onChange={(value) => updateProperties({ matchNumber: value === '' ? '' : Number(value) })} />
          <FormField label="Default Value" value={textProp(node, 'defaultValue')} onChange={(defaultValue) => updateProperties({ defaultValue })} />
        </div>
        <CheckboxField label="Use empty default value" checked={boolProp(node, 'emptyDefault')} onChange={(emptyDefault) => updateProperties({ emptyDefault })} />
      </Section>
    </>
  )
}

export function ResponseAssertionEditor({ node, updateProperties }: EditorProps) {
  return (
    <>
      <Section title="Response Field to Test">
        <div className="form-grid two-columns">
          <SelectField label="Apply to" value={textProp(node, 'applyTo', 'main-and-sub')} options={[{ value: 'main-and-sub', label: 'Main sample and sub-samples' }, { value: 'main', label: 'Main sample only' }, { value: 'sub', label: 'Sub-samples only' }, { value: 'variable', label: 'JMeter Variable' }]} onChange={(applyTo) => updateProperties({ applyTo })} />
          <SelectField label="Field to test" value={textProp(node, 'field', 'response-code')} options={[{ value: 'text', label: 'Text Response' }, { value: 'response-code', label: 'Response Code' }, { value: 'response-message', label: 'Response Message' }, { value: 'response-headers', label: 'Response Headers' }, { value: 'request-headers', label: 'Request Headers' }, { value: 'url', label: 'URL Sampled' }, { value: 'document', label: 'Document' }]} onChange={(field) => updateProperties({ field })} />
        </div>
        <RadioGroup legend="Pattern Matching Rules" value={textProp(node, 'matchType', 'equals')} options={[{ value: 'contains', label: 'Contains' }, { value: 'matches', label: 'Matches' }, { value: 'equals', label: 'Equals' }, { value: 'substring', label: 'Substring' }]} onChange={(matchType) => updateProperties({ matchType })} />
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

import { CodeEditor } from '../components/common/CodeEditor'

export function JSR223Editor({ node, updateProperties }: EditorProps) {
  const language = textProp(node, 'language', 'groovy')
  const script = textProp(node, 'script')

  return (
    <div className="jsr223-editor">
      <Section title="Script Language">
        <div className="form-grid two-columns">
          <SelectField
            label="Language"
            value={language}
            options={['groovy', 'javascript', 'java', 'beanshell']}
            onChange={(newLang) => updateProperties({ language: newLang })}
          />
          <FormField
            label="Parameters"
            value={textProp(node, 'parameters')}
            onChange={(parameters) => updateProperties({ parameters })}
          />
          <FormField
            label="Script File"
            value={textProp(node, 'scriptFile')}
            onChange={(scriptFile) => updateProperties({ scriptFile })}
          />
        </div>
        <CheckboxField
          label="Cache compiled script if available"
          checked={boolProp(node, 'cache', true)}
          onChange={(cache) => updateProperties({ cache })}
        />
      </Section>

      <div className="jsr223-script-section">
        <CodeEditor
          label="Script"
          language={language}
          value={script}
          minHeight={360}
          placeholder={'// Enter your ' + language + ' script here...\nlog.info("Running script");'}
          onChange={(newScript) => updateProperties({ script: newScript })}
        />
      </div>
    </div>
  )
}
