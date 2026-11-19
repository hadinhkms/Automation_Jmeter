import type { TableRow } from '../../models/jmeter'
import { FormField, SelectField, Section } from '../../components/common/FormControls'
import { EditableTable } from '../../components/common/EditableTable'
import { CodeEditor } from '../../components/common/CodeEditor'
import type { EditorProps } from '../editorUtils'

export function GRPCSamplerEditor({ node, updateProperties }: EditorProps) {
  // SAFETY: property is written only by its editor as TableRow[]; missing value falls back to the default
  const metadata = (node.properties.metadata as TableRow[]) || []

  return (
    <div className="editor-group-form">
      <Section title="gRPC Server & Service Configuration">
        <div className="form-grid-3">
          <FormField
            label="Server Name / IP"
            placeholder="grpc.example.com"
            value={String(node.properties.server ?? '')}
            onChange={(val) => updateProperties({ server: val })}
          />
          <FormField
            label="Port"
            type="number"
            placeholder="50051"
            value={String(node.properties.port ?? '50051')}
            onChange={(val) => updateProperties({ port: val })}
          />
          <FormField
            label="Deadline (ms)"
            type="number"
            placeholder="5000"
            value={String(node.properties.deadline ?? '5000')}
            onChange={(val) => updateProperties({ deadline: val })}
          />
        </div>
        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <FormField
            label="Full Method Name"
            placeholder="package.ServiceName/MethodName"
            value={String(node.properties.fullMethod ?? '')}
            onChange={(val) => updateProperties({ fullMethod: val })}
          />
          <SelectField
            label="Channel Security"
            value={String(node.properties.tls ?? 'false')}
            options={[
              { value: 'false', label: 'Plaintext (Insecure)' },
              { value: 'true', label: 'TLS (Secured)' },
            ]}
            onChange={(val) => updateProperties({ tls: val })}
          />
        </div>
      </Section>
      <Section title="Proto Definition (Protobuf Folder Path)">
        <FormField
          label="Proto Root Folder"
          placeholder="/path/to/proto/files"
          value={String(node.properties.protoFolder ?? '')}
          onChange={(val) => updateProperties({ protoFolder: val })}
        />
        <div style={{ marginTop: 8 }}>
          <FormField
            label="Library Folder (Optional)"
            placeholder="/path/to/lib"
            value={String(node.properties.libFolder ?? '')}
            onChange={(val) => updateProperties({ libFolder: val })}
          />
        </div>
      </Section>
      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-color, #fff)' }}>
          Request Payload (JSON)
        </label>
        <CodeEditor
          label="gRPC Payload"
          value={String(node.properties.requestJson ?? '{\n  "field1": "value1"\n}')}
          language="json"
          onChange={(val) => updateProperties({ requestJson: val })}
          minHeight={200}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <Section title="Metadata Headers">
          <EditableTable
            columns={[
              { key: 'name', label: 'Metadata Key', minWidth: 200 },
              { key: 'value', label: 'Metadata Value', minWidth: 300 },
            ]}
            rows={metadata}
            newRow={{ name: '', value: '' }}
            onChange={(rows) => updateProperties({ metadata: rows })}
            compact
          />
        </Section>
      </div>
    </div>
  )
}
