import { jmeterRunner } from '../jmeterRunner'
import { sendWebhookNotification } from '../webhookNotifier'
import { parseJsonBody, statusFromError } from '../httpUtils'
import { errorMessage, sendJson, type RouteHandler } from './routeUtils'
import { computeHeadlessStats, evaluateSla, parseWebhookType, type RunExecutionSummary } from './headlessSla'

function waitForRunEnd(runId: string): Promise<RunExecutionSummary> {
  return new Promise<RunExecutionSummary>((resolve) => {
    const onDone = (resSummary: RunExecutionSummary) => {
      if (resSummary.runId === runId) {
        jmeterRunner.off('complete', onDone)
        jmeterRunner.off('stopped', onDone)
        jmeterRunner.off('error', onDone)
        resolve(resSummary)
      }
    }
    jmeterRunner.on('complete', onDone)
    jmeterRunner.on('stopped', onDone)
    jmeterRunner.on('error', onDone)
  })
}

/** CI/CD headless run with SLA quality gates, plus the webhook test endpoint. */
export const handleHeadlessRoutes: RouteHandler = async (req, res, url) => {
  if (url === '/api/jmeter/run-headless' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const jmx = typeof body.jmx === 'string' ? body.jmx : ''
      const name = typeof body.name === 'string' ? body.name : 'headless_test'
      const slaThresholds = (body.slaThresholds as Record<string, unknown>) || {}
      const webhook = (body.webhook as Record<string, unknown>) || {}
      const remoteHosts = body.remoteHosts as string[] | string | undefined

      if (!jmx) {
        sendJson(res, { error: 'Missing JMX content.' }, 400)
        return true
      }

      const { runId, reportDir } = await jmeterRunner.startRun(jmx, name, { remoteHosts })
      const summary = await waitForRunEnd(runId)
      const stats = computeHeadlessStats(summary)
      const { totalSamples, errors, errorRate, avg, p90, p95 } = stats
      const { slaPassed, slaSummary } = evaluateSla(stats, slaThresholds)

      // Send webhook if configured
      if (webhook && webhook.enabled && webhook.url) {
        if ((slaPassed && webhook.notifyOnPass) || (!slaPassed && webhook.notifyOnFail)) {
          await sendWebhookNotification(String(webhook.url), parseWebhookType(webhook.type), {
            testName: name,
            runId,
            status: slaPassed ? 'passed' : 'failed',
            totalSamples,
            errors,
            errorRate,
            avgLatency: avg,
            p90Latency: p90,
            p95Latency: p95,
            throughput: totalSamples / Math.max(1, 10),
            durationSeconds: 10,
            slaSummary,
          })
        }
      }

      const exitCode = summary.status === 'failed' ? 2 : slaPassed ? 0 : 1
      sendJson(res, {
        exitCode,
        slaPassed,
        runId,
        reportDir,
        summary: { totalSamples, errors, errorRate, avgLatency: avg, p90Latency: p90, p95Latency: p95, slaSummary },
      })
    } catch (err) {
      sendJson(res, { exitCode: 2, error: errorMessage(err, 'Headless execution error') }, statusFromError(err))
    }
    return true
  }

  // --- Webhook Test Endpoint ---
  if (url === '/api/jmeter/test-webhook' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const webhookUrl = typeof body.url === 'string' ? body.url : ''
      const webhookType = parseWebhookType(body.type)
      if (!webhookUrl) {
        sendJson(res, { error: 'Missing webhook URL' }, 400)
        return true
      }
      const result = await sendWebhookNotification(webhookUrl, webhookType, {
        testName: 'Smoke Test Plan (Verification Test)',
        runId: `test_${Date.now()}`,
        status: 'passed',
        totalSamples: 1500,
        errors: 0,
        errorRate: 0,
        avgLatency: 85,
        p90Latency: 120,
        p95Latency: 165,
        p99Latency: 210,
        throughput: 250.0,
        durationSeconds: 30,
        slaSummary: 'All 4 SLA quality gate rules passed successfully!',
      })
      sendJson(res, result)
    } catch (err) {
      sendJson(res, { success: false, error: errorMessage(err, 'Webhook error') }, statusFromError(err))
    }
    return true
  }

  return false
}
