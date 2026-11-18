import type { IncomingMessage, ServerResponse } from 'node:http'
import { validateMockRouteList } from '../../src/models/mockServer'
import { parseJsonBody, statusFromError } from '../httpUtils'
import { findMockRoute, loadMockRoutes, normaliseRoutes, saveMockRoutes } from '../mock/mockRouteStore'
import { errorMessage, sendJson, type RouteHandler } from './routeUtils'

const ROUTES_API = '/api/jmeter/mock/routes'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Serves `/mock/*` from the configured mock routes (any method, CORS open for load tests). */
export async function handleMockServe(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const rawUrl = req.url || ''
  if (rawUrl !== '/mock' && !rawUrl.startsWith('/mock/') && !rawUrl.startsWith('/mock?')) return false

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return true
  }

  let path = rawUrl.split('?')[0]
  try {
    path = decodeURIComponent(path)
  } catch {
    // keep the raw path when it is not valid percent-encoding
  }

  const route = findMockRoute(loadMockRoutes(), req.method || 'GET', path)
  if (!route) {
    sendJson(res, { error: `No active mock for ${req.method} ${path}`, hint: 'Add one in Tools > Local Mock Server.' }, 404)
    return true
  }

  req.resume() // drain the request body; mocks ignore it
  if (route.delayMs > 0) await wait(route.delayMs)
  res.statusCode = route.status
  res.setHeader('Content-Type', route.contentType)
  res.setHeader('X-Mock-Route', route.id)
  res.end(route.body)
  return true
}

/** CRUD API: GET returns all routes, POST replaces the full list after validation. */
export const handleMockRoutesApi: RouteHandler = async (req, res, url) => {
  if (url.split('?')[0] !== ROUTES_API) return false

  if (req.method === 'GET') {
    sendJson(res, { routes: loadMockRoutes() })
    return true
  }

  if (req.method !== 'POST') return false

  try {
    const body = await parseJsonBody(req)
    if (!Array.isArray(body.routes)) {
      sendJson(res, { error: '`routes` must be an array.' }, 400)
      return true
    }
    const routes = normaliseRoutes(body.routes)
    if (routes.length !== body.routes.length) {
      sendJson(res, { error: 'Every route needs a string id and path.' }, 400)
      return true
    }
    const invalid = validateMockRouteList(routes)
    if (invalid) {
      sendJson(res, { error: Object.values(invalid.errors)[0], index: invalid.index, errors: invalid.errors }, 400)
      return true
    }
    sendJson(res, { routes: saveMockRoutes(routes) })
  } catch (err) {
    sendJson(res, { error: errorMessage(err, 'Could not save mock routes.') }, statusFromError(err))
  }
  return true
}
