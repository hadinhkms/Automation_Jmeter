import { useState } from 'react'
import type { WebhookConfig } from '../../../models/jmeter'

/** Test-notification state + handler for the SLA webhook settings. */
export function useWebhookTest(webhook: WebhookConfig) {
  const [testStatus, setTestStatus] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)

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

  return { testStatus, isTesting, handleTestWebhook }
}
