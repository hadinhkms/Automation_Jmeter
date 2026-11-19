import type { IncomingMessage, ServerResponse } from 'node:http'
import { validateMockRouteList } from '../../src/models/mockServer'
import { parseJsonBody, statusFromError } from '../httpUtils'
import { findMockRoute, findRouteTypeError, loadMockRoutes, normaliseRoutes, saveMockRoutes } from '../mock/mockRouteStore'
import { errorMessage, sendJson, type RouteHandler } from './routeUtils'

const ROUTES_API = '/api/jmeter/mock/routes'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Headers on every /mock/* answer: open CORS for load tests, but the body can never run as the app origin. */
function setMockHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', 'sandbox')
}

async function serveMock(req: IncomingMessage, res: ServerResponse, rawUrl: string): Promise<void> {
  const method = (req.method || 'GET').toUpperCase()
  const rawPath = rawUrl.split('?')[0].split('#')[0]
  const route = findMockRoute(loadMockRoutes(), method, rawPath)
  if (!route) {
    sendJson(res, { error: `No active mock for ${method} ${rawPath}`, hint: 'Add one in Tools > Local Mock Server.' }, 404)
    return
  }

  req.resume() // drain the request body; mocks ignore it
  if (route.delayMs > 0) await wait(route.delayMs)
  if (res.writableEnded || res.destroyed) return
  res.statusCode = route.status
  res.setHeader('Content-Type', route.contentType)
  res.setHeader('X-Mock-Route', route.id)
  res.end(method === 'HEAD' ? undefined : route.body)
}

/** Serves `/mock/*` from the configured mock routes (any method, CORS open for load tests). */
export async function handleMockServe(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const rawUrl = req.url || ''
  if (rawUrl !== '/mock' && !rawUrl.startsWith('/mock/') && !rawUrl.startsWith('/mock?')) return false

  try {
    setMockHeaders(res)
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return true
    }
    await serveMock(req, res, rawUrl)
  } catch (err) {
    console.warn('[mock-server] failed to serve', rawUrl, err)
    if (!res.headersSent) {
      res.removeHeader('X-Mock-Route')
      sendJson(res, { error: `Mock could not be served: ${errorMessage(err, 'unknown error')}` }, 500)
    } else if (!res.writableEnded) {
      res.end()
    }
  }
  return true
}

/** CSRF guard: JSON content type only, and a present Origin must be this dev server. Returns true when rejected. */
function rejectUnsafeWrite(req: IncomingMessage, res: ServerResponse): boolean {
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    sendJson(res, { error: 'Content-Type must be application/json.' }, 415)
    return true
  }
  const origin = req.headers.origin
  if (origin !== undefined) {
    let originHost = ''
    try {
      originHost = new URL(origin).host
    } catch {
      // "null" or malformed origins never match
    }
    if (!originHost || originHost.toLowerCase() !== String(req.headers.host || '').toLowerCase()) {
      sendJson(res, { error: 'Cross-origin writes to the mock routes API are not allowed.' }, 403)
      return true
    }
  }
  return false
}

/** CRUD API: GET returns all routes, POST replaces the full list after validation. */
export const handleMockRoutesApi: RouteHandler = async (req, res, url) => {
  if (url.split('?')[0] !== ROUTES_API) return false

  if (req.method === 'GET') {
    sendJson(res, { routes: loadMockRoutes() })
    return true
  }

  if (req.method !== 'POST') return false
  if (rejectUnsafeWrite(req, res)) return true

  try {
    const body = await parseJsonBody(req)
    if (!Array.isArray(body.routes)) {
      sendJson(res, { error: '`routes` must be an array.' }, 400)
      return true
    }
    const typeError = findRouteTypeError(body.routes)
    if (typeError) {
      sendJson(res, { error: typeError.error, index: typeError.index }, 400)
      return true
    }
    const routes = normaliseRoutes(body.routes)
    const invalid = validateMockRouteList(routes)
    if (invalid) {
      sendJson(res, { error: Object.values(invalid.errors)[0], index: invalid.index, errors: invalid.errors }, 400)
      return true
    }
    sendJson(res, { routes: saveMockRoutes(routes) })
  } catch (err) {
    sendJson(res, { error: errorMessage(err, 'Could not save mocks.') }, statusFromError(err))
  }
  return true
}
