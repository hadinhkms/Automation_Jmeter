export interface WebhookPayloadData {
  testName: string
  runId: string
  status: 'passed' | 'failed' | 'error'
  totalSamples: number
  errors: number
  errorRate: number
  avgLatency: number
  p90Latency?: number
  p95Latency?: number
  p99Latency?: number
  throughput: number
  durationSeconds: number
  slaSummary?: string
  slaRules?: Array<{ name: string; actual: number; target: number; passed: boolean; unit: string }>
}

export async function sendWebhookNotification(
  webhookUrl: string,
  webhookType: 'discord' | 'slack' | 'teams' | 'generic',
  data: WebhookPayloadData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const isPassed = data.status === 'passed'
    let body: unknown = {}

    if (webhookType === 'discord') {
      body = {
        username: 'JMeter Performance Studio',
        avatar_url: 'https://jmeter.apache.org/images/jmeter_square.png',
        embeds: [
          {
            title: `${isPassed ? '✅' : '❌'} Test Run ${data.runId} - ${data.testName}`,
            description: data.slaSummary || `Execution ${data.status.toUpperCase()} with ${data.errorRate.toFixed(2)}% errors.`,
            color: isPassed ? 0x10b981 : 0xef4444,
            fields: [
              { name: 'Total Requests', value: String(data.totalSamples), inline: true },
              { name: 'Throughput', value: `${data.throughput.toFixed(1)} req/s`, inline: true },
              { name: 'Avg Latency', value: `${data.avgLatency} ms`, inline: true },
              { name: 'P95 Latency', value: `${data.p95Latency ?? 'N/A'} ms`, inline: true },
              { name: 'Error Rate', value: `${data.errorRate.toFixed(2)}% (${data.errors})`, inline: true },
              { name: 'Duration', value: `${data.durationSeconds}s`, inline: true },
            ],
            footer: { text: 'JMeter Web Studio CI/CD Quality Gates' },
            timestamp: new Date().toISOString(),
          },
        ],
      }
    } else if (webhookType === 'slack') {
      body = {
        text: `*JMeter Performance Test Report:* ${isPassed ? '✅ PASSED' : '❌ FAILED'} for *${data.testName}*`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*JMeter Run ${data.runId} Completed*\n• Status: *${data.status.toUpperCase()}*\n• Total Requests: *${data.totalSamples}*\n• Avg Latency: *${data.avgLatency}ms* (P95: *${data.p95Latency || 'N/A'}ms*)\n• Throughput: *${data.throughput.toFixed(1)} req/s*\n• Error Rate: *${data.errorRate.toFixed(2)}%*\n• SLA: _${data.slaSummary || 'N/A'}_`,
            },
          },
        ],
      }
    } else if (webhookType === 'teams') {
      body = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: isPassed ? '10B981' : 'EF4444',
        summary: `JMeter Test ${data.testName} - ${data.status.toUpperCase()}`,
        sections: [
          {
            activityTitle: `JMeter Performance Run: ${data.testName}`,
            activitySubtitle: `Run ID: ${data.runId} | Status: ${data.status.toUpperCase()}`,
            facts: [
              { name: 'Total Samples', value: String(data.totalSamples) },
              { name: 'Throughput', value: `${data.throughput.toFixed(1)} RPS` },
              { name: 'Avg Latency', value: `${data.avgLatency} ms` },
              { name: 'P95 Latency', value: `${data.p95Latency || 'N/A'} ms` },
              { name: 'Errors', value: `${data.errors} (${data.errorRate.toFixed(2)}%)` },
              { name: 'SLA Evaluation', value: data.slaSummary || 'N/A' },
            ],
            markdown: true,
          },
        ],
      }
    } else {
      // Generic JSON
      body = data
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${res.statusText}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
