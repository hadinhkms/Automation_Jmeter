import { ApplyToPanel, CheckboxField, FormField, Section, SelectField } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { boolProp, numberProp, textProp } from '../editorUtils'

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
