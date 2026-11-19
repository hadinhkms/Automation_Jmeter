import { Section, SelectField } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { boolProp } from '../editorUtils'

export function DebugSamplerEditor({ node, updateProperties }: EditorProps) {
  return (
    <>
      <Section title="Debug Sampler Properties">
        <div className="two-columns">
          <SelectField
            label="JMeter properties"
            value={boolProp(node, 'displayJMeterProperties', false) ? 'true' : 'false'}
            options={[
              { label: 'False', value: 'false' },
              { label: 'True', value: 'true' },
            ]}
            onChange={(val) => updateProperties({ displayJMeterProperties: val === 'true' })}
          />
          <SelectField
            label="JMeter variables"
            value={boolProp(node, 'displayJMeterVariables', true) ? 'true' : 'false'}
            options={[
              { label: 'True', value: 'true' },
              { label: 'False', value: 'false' },
            ]}
            onChange={(val) => updateProperties({ displayJMeterVariables: val === 'true' })}
          />
          <SelectField
            label="Sampler properties"
            value={boolProp(node, 'displaySamplerProperties', false) ? 'true' : 'false'}
            options={[
              { label: 'False', value: 'false' },
              { label: 'True', value: 'true' },
            ]}
            onChange={(val) => updateProperties({ displaySamplerProperties: val === 'true' })}
          />
          <SelectField
            label="System properties"
            value={boolProp(node, 'displaySystemProperties', false) ? 'true' : 'false'}
            options={[
              { label: 'False', value: 'false' },
              { label: 'True', value: 'true' },
            ]}
            onChange={(val) => updateProperties({ displaySystemProperties: val === 'true' })}
          />
        </div>
      </Section>
    </>
  )
}
