import { useState } from 'react'
import { Check, ShieldCheck, X } from 'lucide-react'
import type { SlaThresholds, WebhookConfig } from '../../models/jmeter'
import { useWebhookTest } from './slaSettings/useWebhookTest'
import { SlaThresholdsSection } from './slaSettings/SlaThresholdsSection'
import { WebhookSection } from './slaSettings/WebhookSection'

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
  const { testStatus, isTesting, handleTestWebhook } = useWebhookTest(webhook)

  if (!isOpen) return null

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
          <SlaThresholdsSection thresholds={thresholds} setThresholds={setThresholds} />

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

          {/* Webhook Alerts */}
          <WebhookSection
            webhook={webhook}
            setWebhook={setWebhook}
            testStatus={testStatus}
            isTesting={isTesting}
            onTestWebhook={handleTestWebhook}
          />
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
