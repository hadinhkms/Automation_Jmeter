import { EditableTable } from '../../components/common/EditableTable'
import { CheckboxField, Section } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { boolProp, rowsProp } from '../editorUtils'

export function HTTPHeaderManagerEditor({ node, updateProperties }: EditorProps) {
  return (
    <Section title="HTTP Headers">
      <EditableTable
        columns={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }]}
        rows={rowsProp(node, 'headers')}
        newRow={{ name: '', value: '' }}
        onChange={(headers) => updateProperties({ headers })}
      />
    </Section>
  )
}

export function HTTPCookieManagerEditor({ node, updateProperties }: EditorProps) {
  return (
    <>
      <Section title="Cookie Policy">
        <div className="checkbox-stack inline-checks">
          <CheckboxField label="Clear cookies each iteration" checked={boolProp(node, 'clearEachIteration')} onChange={(clearEachIteration) => updateProperties({ clearEachIteration })} />
          <CheckboxField label="Controlled by Thread Group" checked={boolProp(node, 'controlledByThreadGroup')} onChange={(controlledByThreadGroup) => updateProperties({ controlledByThreadGroup })} />
        </div>
      </Section>
      <Section title="Stored Cookies">
        <EditableTable
          columns={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }, { key: 'domain', label: 'Domain' }, { key: 'path', label: 'Path' }, { key: 'secure', label: 'Secure', type: 'checkbox' }, { key: 'expires', label: 'Expires' }]}
          rows={rowsProp(node, 'cookies')}
          newRow={{ name: '', value: '', domain: '', path: '/', secure: false, expires: '' }}
          onChange={(cookies) => updateProperties({ cookies })}
        />
      </Section>
    </>
  )
}
