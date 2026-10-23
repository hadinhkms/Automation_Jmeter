import { CheckboxField, FormField, Section } from '../components/common/FormControls'
import type { EditorProps } from './editorUtils'
import { boolProp, textProp } from './editorUtils'

export function JSONPathAssertionEditor({ node, updateProperties }: EditorProps) {
  const jsonValidation = boolProp(node, 'jsonValidation', true)

  return (
    <div className="json-path-assertion-editor">
      <Section title="JSON Assertion Configuration">
        <div className="form-grid">
          <FormField
            label="Assert JSON Path exists:"
            value={textProp(node, 'jsonPath')}
            placeholder="$.code"
            onChange={(jsonPath) => updateProperties({ jsonPath })}
          />
        </div>

        <div className="checkbox-stack" style={{ marginTop: '0.75rem' }}>
          <CheckboxField
            label="Additionally validate value"
            checked={jsonValidation}
            onChange={(val) => updateProperties({ jsonValidation: val })}
          />
        </div>

        {jsonValidation && (
          <div className="form-grid" style={{ marginTop: '0.75rem' }}>
            <FormField
              label="Expected Value:"
              value={textProp(node, 'expectedValue')}
              placeholder="200"
              onChange={(expectedValue) => updateProperties({ expectedValue })}
            />
          </div>
        )}

        <div className="checkbox-stack" style={{ marginTop: '0.75rem' }}>
          <CheckboxField
            label="Match as regular expression"
            checked={boolProp(node, 'isRegex', false)}
            onChange={(isRegex) => updateProperties({ isRegex })}
          />
          <CheckboxField
            label="Expect null"
            checked={boolProp(node, 'expectNull', false)}
            onChange={(expectNull) => updateProperties({ expectNull })}
          />
          <CheckboxField
            label="Invert assertion (will fail if above conditions met)"
            checked={boolProp(node, 'invert', false)}
            onChange={(invert) => updateProperties({ invert })}
          />
        </div>
      </Section>
    </div>
  )
}
