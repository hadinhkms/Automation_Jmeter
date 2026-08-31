import { EditableTable } from '../components/common/EditableTable'
import {
  CheckboxField,
  FormField,
  Section,
  SelectField,
} from '../components/common/FormControls'
import type { EditorProps } from './editorUtils'
import { boolProp, rowsProp, textProp } from './editorUtils'

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

export function CSVDataSetEditor({ node, updateProperties }: EditorProps) {
  const sharingMode = textProp(node, 'sharingMode', 'all')
  return (
    <Section title="CSV Data Set Configuration">
      <div className="form-grid two-columns">
        <FormField label="Filename" value={textProp(node, 'filename')} placeholder="users.csv" onChange={(filename) => updateProperties({ filename })} />
        <FormField label="File Encoding" value={textProp(node, 'encoding', 'UTF-8')} onChange={(encoding) => updateProperties({ encoding })} />
        <FormField label="Variable Names" value={textProp(node, 'variableNames')} placeholder="username,password" onChange={(variableNames) => updateProperties({ variableNames })} />
        <FormField label="Delimiter" value={textProp(node, 'delimiter', ',')} onChange={(delimiter) => updateProperties({ delimiter })} />
        <SelectField
          label="Sharing mode"
          value={sharingMode}
          options={[
            { value: 'all', label: 'All threads' },
            { value: 'group', label: 'Current thread group' },
            { value: 'thread', label: 'Current thread' },
            { value: 'identifier', label: 'Identifier' },
          ]}
          onChange={(value) => updateProperties({ sharingMode: value })}
        />
        {sharingMode === 'identifier' ? <FormField label="Identifier" value={textProp(node, 'identifier')} onChange={(identifier) => updateProperties({ identifier })} /> : <div />}
      </div>
      <div className="checkbox-stack inline-checks">
        <CheckboxField label="Ignore first line" checked={boolProp(node, 'ignoreFirstLine')} onChange={(ignoreFirstLine) => updateProperties({ ignoreFirstLine })} />
        <CheckboxField label="Allow quoted data" checked={boolProp(node, 'quotedData')} onChange={(quotedData) => updateProperties({ quotedData })} />
        <CheckboxField label="Recycle on EOF" checked={boolProp(node, 'recycle', true)} onChange={(recycle) => updateProperties({ recycle })} />
        <CheckboxField label="Stop thread on EOF" checked={boolProp(node, 'stopThread')} onChange={(stopThread) => updateProperties({ stopThread })} />
      </div>
    </Section>
  )
}
