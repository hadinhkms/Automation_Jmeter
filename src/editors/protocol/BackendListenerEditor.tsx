import { FormField, SelectField, CheckboxField, Section } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'

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
