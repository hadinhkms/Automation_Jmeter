import type { TableRow, TestPlanNode } from '../models/jmeter'
import { FormField, SelectField, CheckboxField, Section } from '../components/common/FormControls'
import { EditableTable } from '../components/common/EditableTable'
import { CodeEditor } from '../components/common/CodeEditor'

interface EditorProps {
  node: TestPlanNode
  updateProperties: (updates: Record<string, unknown>) => void
}

export function GraphQLSamplerEditor({ node, updateProperties }: EditorProps) {
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

export function BackendListenerEditor({ node, updateProperties }: EditorProps) {
  return (
    <div className="editor-group-form">
      <Section title="Backend Client Implementation & Connection">
        <div className="form-grid-2">
          <SelectField
            label="Backend Listener Implementation"
            value={String(node.properties.classname ?? 'org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender')}
            options={[
              {
                value: 'org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender',
                label: 'InfluxDB v2 / InfluxDB v1 (HttpMetricsSender)',
              },
              {
                value: 'org.apache.jmeter.visualizers.backend.graphite.GraphiteBackendListenerClient',
                label: 'Graphite / Prometheus (GraphiteClient)',
              },
            ]}
            onChange={(val) => updateProperties({ classname: val })}
          />
          <FormField
            label="InfluxDB Write URL"
            placeholder="http://localhost:8086/api/v2/write?org=org&bucket=jmeter"
            value={String(node.properties.influxdbUrl ?? 'http://localhost:8086/api/v2/write?org=org&bucket=jmeter')}
            onChange={(val) => updateProperties({ influxdbUrl: val })}
          />
        </div>
      </Section>

      <Section title="Application Tags & Percentiles Configuration">
        <div className="form-grid-3">
          <FormField
            label="Application Name"
            value={String(node.properties.application ?? 'jmeter-load-test')}
            onChange={(val) => updateProperties({ application: val })}
          />
          <FormField
            label="Measurement Name"
            value={String(node.properties.measurement ?? 'jmeter')}
            onChange={(val) => updateProperties({ measurement: val })}
          />
          <FormField
            label="Percentiles (semicolon separated)"
            value={String(node.properties.percentiles ?? '90;95;99')}
            onChange={(val) => updateProperties({ percentiles: val })}
          />
        </div>

        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <FormField
            label="Test Title"
            value={String(node.properties.testTitle ?? 'JMeter Studio Performance Run')}
            onChange={(val) => updateProperties({ testTitle: val })}
          />
          <FormField
            label="Samplers Regex Filter"
            placeholder=".*"
            value={String(node.properties.samplersRegex ?? '.*')}
            onChange={(val) => updateProperties({ samplersRegex: val })}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <CheckboxField
            label="Summary Only (Don't send granular per-sample metrics)"
            checked={Boolean(node.properties.summaryOnly)}
            onChange={(checked) => updateProperties({ summaryOnly: checked })}
          />
        </div>
      </Section>
    </div>
  )
}
