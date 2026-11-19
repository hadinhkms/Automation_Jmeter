import { Send, Webhook } from 'lucide-react'
import { FormField, CheckboxField, SelectField } from '../FormControls'
import type { WebhookConfig } from '../../../models/jmeter'

interface WebhookSectionProps {
  webhook: WebhookConfig
  setWebhook: (webhook: WebhookConfig) => void
  testStatus: string | null
  isTesting: boolean
  onTestWebhook: () => void
}

export function WebhookSection({ webhook, setWebhook, testStatus, isTesting, onTestWebhook }: WebhookSectionProps) {
  return (
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
              // SAFETY: value comes from a SelectField whose options are exactly this union
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
              onClick={onTestWebhook}
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
  )
}
