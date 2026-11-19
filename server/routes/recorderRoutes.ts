import { browserRecorder } from '../browserRecorder'
import { parseJsonBody, statusFromError } from '../httpUtils'
import { errorMessage, openSse, sendJson, type RouteHandler } from './routeUtils'

const RECORDER_EVENTS = ['request-added', 'request-updated', 'started', 'stopped', 'cleared', 'transaction-changed'] as const

/** Browser Recorder APIs: browsers / status / start / stop / transaction / clear / SSE stream. */
export const handleRecorderRoutes: RouteHandler = async (req, res, url) => {
  // A. Detect available browsers
  if (url === '/api/jmeter/recorder/browsers' && req.method === 'GET') {
    sendJson(res, browserRecorder.detectBrowsers())
    return true
  }

  // B. Get Recorder Status & captured requests
  if (url === '/api/jmeter/recorder/status' && req.method === 'GET') {
    sendJson(res, browserRecorder.getStatus())
    return true
  }

  // C. Start Recording
  if (url === '/api/jmeter/recorder/start' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      // SAFETY: unknown browserType values fall through to the first detected browser in resolveBrowserExecutable
      const browserType = (body.browserType as 'chrome' | 'edge' | 'custom') || 'chrome'
      const browserPath = typeof body.browserPath === 'string' ? body.browserPath : undefined
      const targetUrl = typeof body.targetUrl === 'string' ? body.targetUrl : 'about:blank'
      const initialTransaction = typeof body.initialTransaction === 'string' ? body.initialTransaction : '01_Action'
      const port = typeof body.port === 'number' ? body.port : undefined

      const result = await browserRecorder.startRecording({
        browserType,
        browserPath,
        targetUrl,
        initialTransaction,
        port,
      })
      sendJson(res, result)
    } catch (err) {
      sendJson(res, { error: errorMessage(err, 'Failed to launch browser recorder.') }, statusFromError(err))
    }
    return true
  }

  // D. Stop Recording
  if (url === '/api/jmeter/recorder/stop' && req.method === 'POST') {
    try {
      const result = await browserRecorder.stopRecording()
      sendJson(res, result)
    } catch (err) {
      sendJson(res, { error: errorMessage(err, 'Failed to stop recorder.') }, statusFromError(err))
    }
    return true
  }

  // E. Change current transaction name
  if (url === '/api/jmeter/recorder/transaction' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const name = typeof body.name === 'string' ? body.name : 'Default Transaction'
      browserRecorder.setTransaction(name)
      sendJson(res, { success: true, transaction: name })
    } catch (err) {
      sendJson(res, { error: errorMessage(err, 'Invalid request.') }, 400)
    }
    return true
  }

  // F. Clear recorded requests
  if (url === '/api/jmeter/recorder/clear' && req.method === 'POST') {
    browserRecorder.clearRequests()
    sendJson(res, { success: true })
    return true
  }

  // G. Live SSE Stream for Browser Recorder
  if (url === '/api/jmeter/recorder/stream' && req.method === 'GET') {
    const sendRecorderEvent = openSse(res)
    const listeners = RECORDER_EVENTS.map((event) => {
      // 'cleared' carries no payload: always send {}
      const listener = event === 'cleared'
        ? () => sendRecorderEvent('cleared', {})
        : (data: unknown) => sendRecorderEvent(event, data)
      browserRecorder.on(event, listener)
      return [event, listener] as const
    })

    sendRecorderEvent('connected', { status: browserRecorder.getStatus() })

    // Keep-alive heartbeat every 15s to prevent timeout
    const heartbeatTimer = setInterval(() => {
      try {
        res.write(': ping\n\n')
      } catch {
        return
      }
    }, 15000)

    req.on('close', () => {
      clearInterval(heartbeatTimer)
      for (const [event, listener] of listeners) browserRecorder.off(event, listener)
    })
    return true
  }

  return false
}
