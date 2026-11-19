import type { TableRow } from '../../models/jmeter'
import { FormField, SelectField, Section } from '../../components/common/FormControls'
import { EditableTable } from '../../components/common/EditableTable'
import { CodeEditor } from '../../components/common/CodeEditor'
import type { EditorProps } from '../editorUtils'

export function GraphQLSamplerEditor({ node, updateProperties }: EditorProps) {
  // SAFETY: property is written only by its editor as TableRow[]; missing value falls back to the default
  const headers = (node.properties.headers as TableRow[]) || [{ name: 'Content-Type', value: 'application/json' }]

  return (
    <div className="editor-group-form">
      <Section title="GraphQL Endpoint & Server Configuration">
        <div className="form-grid-3">
          <SelectField
            label="Protocol"
            value={String(node.properties.protocol ?? 'https')}
            options={[
              { value: 'http', label: 'HTTP' },
              { value: 'https', label: 'HTTPS' },
            ]}
            onChange={(val) => updateProperties({ protocol: val })}
          />
          <FormField
            label="Server Name / IP"
            placeholder="api.example.com"
            value={String(node.properties.server ?? '')}
            onChange={(val) => updateProperties({ server: val })}
          />
          <FormField
            label="Port Number"
            type="number"
            placeholder="443"
            value={String(node.properties.port ?? '')}
            onChange={(val) => updateProperties({ port: val })}
          />
        </div>

        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <FormField
            label="GraphQL Path"
            placeholder="/graphql"
            value={String(node.properties.path ?? '/graphql')}
            onChange={(val) => updateProperties({ path: val })}
          />
          <FormField
            label="Operation Name (Optional)"
            placeholder="GetUsers"
            value={String(node.properties.operationName ?? '')}
            onChange={(val) => updateProperties({ operationName: val })}
          />
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-color, #fff)' }}>
            GraphQL Query / Mutation
          </label>
          <CodeEditor
            label="Query"
            value={String(node.properties.query ?? 'query {\n  users {\n    id\n    name\n  }\n}')}
            language="graphql"
            onChange={(val) => updateProperties({ query: val })}
            minHeight={220}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-color, #fff)' }}>
            GraphQL Variables (JSON)
          </label>
          <CodeEditor
            label="Variables"
            value={String(node.properties.variables ?? '{\n  "limit": 10\n}')}
            language="json"
            onChange={(val) => updateProperties({ variables: val })}
            minHeight={220}
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Section title="Custom Request Headers">
          <EditableTable
            columns={[
              { key: 'name', label: 'Header Name', minWidth: 200 },
              { key: 'value', label: 'Header Value', minWidth: 300 },
            ]}
            rows={headers}
            newRow={{ name: '', value: '' }}
            onChange={(rows) => updateProperties({ headers: rows })}
            compact
          />
        </Section>
      </div>
    </div>
  )
}
