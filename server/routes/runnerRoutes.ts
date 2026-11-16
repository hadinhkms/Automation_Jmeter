import { jmeterRunner } from '../jmeterRunner'
import { parseJsonBody, statusFromError } from '../httpUtils'
import { errorMessage, openSse, requestUrl, sendJson, type RouteHandler } from './routeUtils'

const RUNNER_EVENTS = ['start', 'log', 'progress', 'samples', 'complete', 'stopped', 'error'] as const

/** Detect / config / status / run / stop / results / SSE live stream. */
export const handleRunnerRoutes: RouteHandler = async (req, res, url) => {
  // 1. Detect JMeter
  if (url === '/api/jmeter/detect' && req.method === 'GET') {
    const result = await jmeterRunner.detectJMeter()
    sendJson(res, result)
    return true
  }

  // 2. Configure Custom Path
  if (url === '/api/jmeter/config' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const customPath = typeof body.path === 'string' ? body.path : ''
      const customHeap = typeof body.heap === 'string' ? body.heap : ''
      jmeterRunner.setCustomPath(customPath)
      if (customHeap) {
        jmeterRunner.setCustomHeap(customHeap)
      }
      const detection = await jmeterRunner.detectJMeter(true)
      sendJson(res, { success: true, detection })
    } catch (err) {
      sendJson(res, { error: errorMessage(err, 'Invalid request') }, 400)
    }
    return true
  }

  // 3. Status
  if (url === '/api/jmeter/status' && req.method === 'GET') {
    sendJson(res, jmeterRunner.getStatus())
    return true
  }

  // 4. Start Run
  if (url === '/api/jmeter/run' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const jmx = typeof body.jmx === 'string' ? body.jmx : ''
      const name = typeof body.name === 'string' ? body.name : 'test_plan'

      if (!jmx) {
        sendJson(res, { error: 'Missing JMX content.' }, 400)
        return true
      }

      const remoteHosts = body.remoteHosts as string[] | string | undefined
      const heap = typeof body.heap === 'string' ? body.heap : undefined
      const { runId, reportDir } = await jmeterRunner.startRun(jmx, name, { remoteHosts, heap })
      sendJson(res, { success: true, runId, reportDir })
    } catch (err) {
      sendJson(res, { error: errorMessage(err, 'Failed to start run.') }, statusFromError(err))
    }
    return true
  }

  // 5. Stop Run
  if (url === '/api/jmeter/stop' && req.method === 'POST') {
    sendJson(res, jmeterRunner.stopRun())
    return true
  }

  // 6. Get Results
  if (url.startsWith('/api/jmeter/results') && req.method === 'GET') {
    const runId = requestUrl(req, url).searchParams.get('runId') || undefined
    const results = jmeterRunner.getRunResults(runId)
    sendJson(res, results || { error: 'No results found' }, results ? undefined : 404)
    return true
  }

  // 9. SSE Live Stream
  if (url === '/api/jmeter/stream' && req.method === 'GET') {
    const sendEvent = openSse(res)
    const listeners = RUNNER_EVENTS.map((event) => {
      const listener = (data: unknown) => sendEvent(event, data)
      jmeterRunner.on(event, listener)
      return [event, listener] as const
    })

    sendEvent('connected', { status: jmeterRunner.getStatus() })

    req.on('close', () => {
      for (const [event, listener] of listeners) jmeterRunner.off(event, listener)
    })
    return true
  }

  return false
}
