import { EditableTable } from '../../components/common/EditableTable'
import { CheckboxField, Section } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { boolProp, rowsProp } from '../editorUtils'

export function TestPlanEditor({ node, updateProperties }: EditorProps) {
  return (
    <>
      <Section title="User Defined Variables">
        <EditableTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'value', label: 'Value' },
            { key: 'description', label: 'Description' },
          ]}
          rows={rowsProp(node, 'variables')}
          newRow={{ name: '', value: '', description: '' }}
          onChange={(variables) => updateProperties({ variables })}
        />
      </Section>

      <Section title="Test Plan Options">
        <div className="checkbox-stack">
          <CheckboxField
            label="Run Thread Groups consecutively (i.e. run one at a time)"
            checked={boolProp(node, 'serializeThreadGroups')}
            onChange={(serializeThreadGroups) => updateProperties({ serializeThreadGroups })}
          />
          <CheckboxField
            label="Run tearDown Thread Groups after shutdown of main threads"
            checked={boolProp(node, 'tearDownAfterShutdown', true)}
            onChange={(tearDownAfterShutdown) => updateProperties({ tearDownAfterShutdown })}
          />
          <CheckboxField
            label="Functional Test Mode (i.e. save Response Data and SamplerData)"
            checked={boolProp(node, 'functionalMode')}
            onChange={(functionalMode) => updateProperties({ functionalMode })}
          />
        </div>
      </Section>

      <Section title="Add directory or jar to classpath">
        <EditableTable
          columns={[{ key: 'path', label: 'Library / JAR / Directory Path' }]}
          rows={rowsProp(node, 'userDefinedClasspath')}
          newRow={{ path: '' }}
          onChange={(userDefinedClasspath) => updateProperties({ userDefinedClasspath })}
        />
      </Section>
    </>
  )
}


export function UserDefinedVariablesEditor({ node, updateProperties }: EditorProps) {
  return (
    <Section title="Variables">
      <EditableTable
        columns={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }, { key: 'description', label: 'Description' }]}
        rows={rowsProp(node, 'variables')}
        newRow={{ name: '', value: '', description: '' }}
        onChange={(variables) => updateProperties({ variables })}
      />
    </Section>
  )
}
