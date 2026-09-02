import { useState } from 'react'
import { Check, Send, ShieldCheck, Webhook, X } from 'lucide-react'
import { FormField, CheckboxField, SelectField } from './FormControls'
import type { SlaThresholds, WebhookConfig } from '../../models/jmeter'

interface SlaSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  thresholds?: SlaThresholds
  webhook?: WebhookConfig
  onSave: (thresholds: SlaThresholds, webhook: WebhookConfig) => void
}

export function SlaSettingsModal({
  isOpen,
  onClose,
  thresholds: initialThresholds,
  webhook: initialWebhook,
  onSave,
}: SlaSettingsModalProps) {
  const [thresholds, setThresholds] = useState<SlaThresholds>(initialThresholds || { enabled: false })
  const [webhook, setWebhook] = useState<WebhookConfig>(
    initialWebhook || {
      enabled: false,
      url: '',
      type: 'discord',
      notifyOnPass: false,
      notifyOnFail: true,
    },
  )
  const [testStatus, setTestStatus] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  if (!isOpen) return null

  const handleTestWebhook = async () => {
    if (!webhook.url) {
      setTestStatus('Please enter a Webhook URL first.')
      return
    }
    setIsTesting(true)
    setTestStatus('Sending test notification...')
    try {
      const res = await fetch('/api/jmeter/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhook),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTestStatus('✅ Webhook notification sent successfully!')
      } else {
        setTestStatus(`❌ Failed to send webhook: ${data.error || res.statusText}`)
      }
    } catch (err) {
      setTestStatus(`❌ Connection error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = () => {
    onSave(thresholds, webhook)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="#10b981" />
            <h3>SLA Quality Gates & Alerting Configuration</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px' }}>
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

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

          {/* Webhook Alerts */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13.5, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Webhook size={16} color="#2563eb" /> Webhook Alert Notifications (Discord / Slack / Teams)
            </h4>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 14 }}>
              <CheckboxField
                label="Send Webhook notification on test run completion"
                checked={Boolean(webhook.enabled)}
                onChange={(checked) => setWebhook({ ...webhook, enabled: checked })}
              />
            </div>

            {webhook.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-grid-2">
                  <SelectField
                    label="Webhook Service Platform"
                    value={webhook.type}
                    options={[
                      { value: 'discord', label: 'Discord Webhook' },
                      { value: 'slack', label: 'Slack Incoming Webhook' },
                      { value: 'teams', label: 'Microsoft Teams Webhook' },
                      { value: 'generic', label: 'Generic JSON Webhook' },
                    ]}
                    onChange={(val) => setWebhook({ ...webhook, type: val as WebhookConfig['type'] })}
                  />
                  <FormField
                    label="Webhook URL Endpoint"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={webhook.url}
                    onChange={(val) => setWebhook({ ...webhook, url: val })}
                  />
                </div>

                <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
                  <CheckboxField
                    label="Notify on Test SLA Passed"
                    checked={webhook.notifyOnPass}
                    onChange={(checked) => setWebhook({ ...webhook, notifyOnPass: checked })}
                  />
                  <CheckboxField
                    label="Notify on Test SLA Failed / Breached"
                    checked={webhook.notifyOnFail}
                    onChange={(checked) => setWebhook({ ...webhook, notifyOnFail: checked })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleTestWebhook}
                    disabled={isTesting || !webhook.url}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Send size={14} /> {isTesting ? 'Sending...' : 'Test Webhook Notification'}
                  </button>
                  {testStatus && <span style={{ fontSize: 12, color: testStatus.includes('Error') ? '#dc2626' : '#16a34a' }}>{testStatus}</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={16} /> Save SLA & Quality Gates
          </button>
        </div>
      </div>
    </div>
  )
}
