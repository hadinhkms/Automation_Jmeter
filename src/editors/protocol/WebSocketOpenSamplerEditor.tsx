import { FormField, SelectField, Section } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'

export function WebSocketOpenSamplerEditor({ node, updateProperties }: EditorProps) {
  return (
    <div className="editor-group-form">
      <Section title="WebSocket Connection Target">
        <div className="form-grid-3">
          <SelectField
            label="Protocol"
            value={String(node.properties.protocol ?? 'wss')}
            options={[
              { value: 'wss', label: 'WSS (TLS Secured)' },
              { value: 'ws', label: 'WS (Plain)' },
            ]}
            onChange={(val) => updateProperties({ protocol: val })}
          />
          <FormField
            label="Server Address"
            placeholder="stream.example.com"
            value={String(node.properties.server ?? '')}
            onChange={(val) => updateProperties({ server: val })}
          />
          <FormField
            label="Port"
            type="number"
            placeholder="443"
            value={String(node.properties.port ?? '443')}
            onChange={(val) => updateProperties({ port: val })}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <FormField
            label="Context Path"
            placeholder="/ws/v1"
            value={String(node.properties.path ?? '/ws')}
            onChange={(val) => updateProperties({ path: val })}
          />
        </div>

        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <FormField
            label="Connection Timeout (ms)"
            type="number"
            value={Number(node.properties.connectTimeout ?? 20000)}
            onChange={(val) => updateProperties({ connectTimeout: Number(val) })}
          />
          <FormField
            label="Read Timeout (ms)"
            type="number"
            value={Number(node.properties.readTimeout ?? 6000)}
            onChange={(val) => updateProperties({ readTimeout: Number(val) })}
          />
        </div>
      </Section>
    </div>
  )
}
