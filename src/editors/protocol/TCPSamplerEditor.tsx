import { FormField, SelectField, CheckboxField, Section } from '../../components/common/FormControls'
import { CodeEditor } from '../../components/common/CodeEditor'
import type { EditorProps } from '../editorUtils'

export function TCPSamplerEditor({ node, updateProperties }: EditorProps) {
  return (
    <div className="editor-group-form">
      <Section title="TCP Server Connection">
        <div className="form-grid-3">
          <FormField
            label="Server Name / IP"
            placeholder="tcp.example.com"
            value={String(node.properties.server ?? '')}
            onChange={(val) => updateProperties({ server: val })}
          />
          <FormField
            label="Port"
            type="number"
            placeholder="9100"
            value={String(node.properties.port ?? '')}
            onChange={(val) => updateProperties({ port: val })}
          />
          <FormField
            label="Timeout (ms)"
            type="number"
            placeholder="10000"
            value={String(node.properties.timeout ?? '10000')}
            onChange={(val) => updateProperties({ timeout: val })}
          />
        </div>
        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <FormField
            label="Connect Timeout (ms)"
            type="number"
            placeholder="5000"
            value={String(node.properties.connectTimeout ?? '5000')}
            onChange={(val) => updateProperties({ connectTimeout: val })}
          />
          <SelectField
            label="TCP Client Class"
            value={String(node.properties.classname ?? 'TCPClientImpl')}
            options={[
              { value: 'TCPClientImpl', label: 'TCPClientImpl (Default)' },
              { value: 'BinaryTCPClientImpl', label: 'BinaryTCPClientImpl (Hex)' },
              { value: 'LengthPrefixedBinaryTCPClientImpl', label: 'LengthPrefixedBinaryTCPClientImpl' },
            ]}
            onChange={(val) => updateProperties({ classname: val })}
          />
        </div>
      </Section>
      <Section title="Connection Options">
        <div className="form-grid-3">
          <CheckboxField
            label="Re-use Connection"
            checked={node.properties.reuseConnection !== false}
            onChange={(checked) => updateProperties({ reuseConnection: checked })}
          />
          <CheckboxField
            label="Close Connection after send"
            checked={Boolean(node.properties.closeConnection)}
            onChange={(checked) => updateProperties({ closeConnection: checked })}
          />
          <CheckboxField
            label="Set NoDelay"
            checked={Boolean(node.properties.noDelay)}
            onChange={(checked) => updateProperties({ noDelay: checked })}
          />
        </div>
        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <FormField
            label="End of Line (EOL) Byte Value"
            placeholder="Leave blank for default"
            value={String(node.properties.eolByte ?? '')}
            onChange={(val) => updateProperties({ eolByte: val })}
          />
          <FormField
            label="SO_LINGER (seconds, -1 to disable)"
            type="number"
            value={String(node.properties.soLinger ?? '')}
            onChange={(val) => updateProperties({ soLinger: val })}
          />
        </div>
      </Section>
      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-color, #fff)' }}>
          Text / Payload to Send
        </label>
        <CodeEditor
          label="TCP Payload"
          value={String(node.properties.requestData ?? '')}
          language="text"
          onChange={(val) => updateProperties({ requestData: val })}
          minHeight={180}
        />
      </div>
    </div>
  )
}
