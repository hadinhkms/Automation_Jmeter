import { FormField, SelectField, CheckboxField, Section } from '../../components/common/FormControls'
import { CodeEditor } from '../../components/common/CodeEditor'
import type { EditorProps } from '../editorUtils'

export function WebSocketSingleWriteSamplerEditor({ node, updateProperties }: EditorProps) {
  return (
    <div className="editor-group-form">
      <Section title="WebSocket Frame Payload Settings">
        <div className="form-grid-2">
          <SelectField
            label="Data Type"
            value={String(node.properties.dataType ?? 'Text')}
            options={[
              { value: 'Text', label: 'Text (JSON / String)' },
              { value: 'Binary', label: 'Binary (Hex / Base64)' },
            ]}
            onChange={(val) => updateProperties({ dataType: val })}
          />
          <div style={{ paddingTop: 24 }}>
            <CheckboxField
              label="Create New Connection if None"
              checked={Boolean(node.properties.createNewConnection)}
              onChange={(checked) => updateProperties({ createNewConnection: checked })}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-color, #fff)' }}>
            Request Frame Payload
          </label>
          <CodeEditor
            label="Frame Payload"
            value={String(node.properties.requestData ?? '{"action":"ping"}')}
            language="json"
            onChange={(val) => updateProperties({ requestData: val })}
            minHeight={180}
          />
        </div>
      </Section>
    </div>
  )
}

export function WebSocketSingleReadSamplerEditor({ node, updateProperties }: EditorProps) {
  return (
    <div className="editor-group-form">
      <Section title="WebSocket Frame Read Settings">
        <div className="form-grid-2">
          <FormField
            label="Read Timeout (ms)"
            type="number"
            value={Number(node.properties.readTimeout ?? 6000)}
            onChange={(val) => updateProperties({ readTimeout: Number(val) })}
          />
          <SelectField
            label="Expected Data Type"
            value={String(node.properties.dataType ?? 'Text')}
            options={[
              { value: 'Text', label: 'Text' },
              { value: 'Binary', label: 'Binary' },
            ]}
            onChange={(val) => updateProperties({ dataType: val })}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <CheckboxField
            label="Create New Connection if None"
            checked={Boolean(node.properties.createNewConnection)}
            onChange={(checked) => updateProperties({ createNewConnection: checked })}
          />
        </div>
      </Section>
    </div>
  )
}

export function WebSocketCloseSamplerEditor({ node, updateProperties }: EditorProps) {
  return (
    <div className="editor-group-form">
      <Section title="WebSocket Disconnect Parameters">
        <div className="form-grid-2">
          <FormField
            label="Status Code"
            type="number"
            value={Number(node.properties.statusCode ?? 1000)}
            onChange={(val) => updateProperties({ statusCode: Number(val) })}
          />
          <FormField
            label="Close Reason"
            value={String(node.properties.closeReason ?? 'Normal Closure')}
            onChange={(val) => updateProperties({ closeReason: val })}
          />
        </div>
      </Section>
    </div>
  )
}
