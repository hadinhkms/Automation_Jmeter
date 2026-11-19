import { FormField, CheckboxField } from '../FormControls'
import type { SlaThresholds } from '../../../models/jmeter'

interface SlaThresholdsSectionProps {
  thresholds: SlaThresholds
  setThresholds: (thresholds: SlaThresholds) => void
}

export function SlaThresholdsSection({ thresholds, setThresholds }: SlaThresholdsSectionProps) {
  return (
    <>
      {/* Enable Quality Gates */}
      <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
        <CheckboxField
          label="Enable Continuous Performance Quality Gates (SLA Evaluation)"
          checked={Boolean(thresholds.enabled)}
          onChange={(checked) => setThresholds({ ...thresholds, enabled: checked })}
        />
        <div style={{ fontSize: 12, color: '#475569', marginTop: 4, marginLeft: 28, lineHeight: 1.5 }}>
          When enabled, test runs will evaluate metrics against your performance thresholds and block CI/CD pipeline if breached.
        </div>
      </div>

      {/* Thresholds Form */}
      <div style={{ opacity: thresholds.enabled ? 1 : 0.5, pointerEvents: thresholds.enabled ? 'auto' : 'none', transition: 'opacity 0.15s' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>Performance Threshold Criteria</h4>
        <div className="form-grid-2">
          <FormField
            label="Max Average Latency (ms)"
            type="number"
            placeholder="300"
            value={thresholds.maxAvgLatencyMs ?? ''}
            onChange={(val) => setThresholds({ ...thresholds, maxAvgLatencyMs: val ? Number(val) : undefined })}
          />
          <FormField
            label="Max 95th Percentile Latency (ms)"
            type="number"
            placeholder="800"
            value={thresholds.maxP95LatencyMs ?? ''}
            onChange={(val) => setThresholds({ ...thresholds, maxP95LatencyMs: val ? Number(val) : undefined })}
          />
        </div>

        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <FormField
            label="Max 99th Percentile Latency (ms)"
            type="number"
            placeholder="1500"
            value={thresholds.maxP99LatencyMs ?? ''}
            onChange={(val) => setThresholds({ ...thresholds, maxP99LatencyMs: val ? Number(val) : undefined })}
          />
          <FormField
            label="Max Tolerated Error Rate (%)"
            type="number"
            placeholder="0.5"
            value={thresholds.maxErrorRatePercent ?? ''}
            onChange={(val) => setThresholds({ ...thresholds, maxErrorRatePercent: val ? Number(val) : undefined })}
          />
        </div>

        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <FormField
            label="Min Expected Throughput (req/s)"
            type="number"
            placeholder="200"
            value={thresholds.minThroughputRps ?? ''}
            onChange={(val) => setThresholds({ ...thresholds, minThroughputRps: val ? Number(val) : undefined })}
          />
          <FormField
            label="Max Allowed Failed Samples"
            type="number"
            placeholder="0"
            value={thresholds.maxFailedTransactions ?? ''}
            onChange={(val) => setThresholds({ ...thresholds, maxFailedTransactions: val ? Number(val) : undefined })}
          />
        </div>
      </div>
    </>
  )
}
