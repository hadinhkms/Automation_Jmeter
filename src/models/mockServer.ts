/** Shared (client + dev server) model and validation for the Local Mock Server (FEAT-P4). */

export const MOCK_METHODS = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export type MockMethod = (typeof MOCK_METHODS)[number]

export const MOCK_PATH_PREFIX = '/mock/'
export const MOCK_MAX_DELAY_MS = 10000
export const MOCK_MAX_ROUTES = 200
export const MOCK_MAX_BODY_CHARS = 512 * 1024

export interface MockRoute {
  id: string
  method: MockMethod
  /** Starts with /mock/; segments like `:id` match any value, a trailing `*` matches the rest. */
  path: string
  status: number
  delayMs: number
  contentType: string
  body: string
  active: boolean
}

export type MockRouteField = 'method' | 'path' | 'status' | 'delayMs' | 'body'
export type MockRouteErrors = Partial<Record<MockRouteField, string>>

export function createEmptyMockRoute(id: string): MockRoute {
  return { id, method: 'GET', path: '/mock/', status: 200, delayMs: 0, contentType: 'application/json', body: '{}', active: true }
}

function methodsOverlap(a: MockMethod, b: MockMethod): boolean {
  return a === 'ANY' || b === 'ANY' || a === b
}

/** Validates one route; `others` are the remaining routes, used for the duplicate check. */
export function validateMockRoute(route: MockRoute, others: MockRoute[] = []): MockRouteErrors {
  const errors: MockRouteErrors = {}
  const path = typeof route.path === 'string' ? route.path.trim() : ''

  if (!MOCK_METHODS.includes(route.method)) errors.method = 'Unsupported method.'

  if (!path.startsWith(MOCK_PATH_PREFIX) || path.length <= MOCK_PATH_PREFIX.length) {
    errors.path = 'Path must start with /mock/ and name an endpoint, e.g. /mock/sms/send.'
  } else if (/[\s?#]/.test(path)) {
    errors.path = 'Path cannot contain spaces, "?" or "#".'
  } else if (others.some((o) => o.path.trim() === path && methodsOverlap(o.method, route.method))) {
    errors.path = 'Another mock already uses this method and path.'
  }

  if (!Number.isInteger(route.status) || route.status < 100 || route.status > 599) {
    errors.status = 'Status must be a whole number from 100 to 599.'
  }

  if (!Number.isInteger(route.delayMs) || route.delayMs < 0 || route.delayMs > MOCK_MAX_DELAY_MS) {
    errors.delayMs = `Delay must be a whole number from 0 to ${MOCK_MAX_DELAY_MS} ms.`
  }

  const body = typeof route.body === 'string' ? route.body : ''
  if (body.length > MOCK_MAX_BODY_CHARS) {
    errors.body = 'Body is larger than 512 KB.'
  } else if (body.trim() && /json/i.test(route.contentType)) {
    try {
      JSON.parse(body)
    } catch {
      errors.body = 'Body is not valid JSON (Content-Type is JSON).'
    }
  }

  return errors
}

/** Validates a whole list; returns the first failing index with its errors, or null when all are valid. */
export function validateMockRouteList(routes: MockRoute[]): { index: number; errors: MockRouteErrors } | null {
  if (routes.length > MOCK_MAX_ROUTES) return { index: MOCK_MAX_ROUTES, errors: { path: `At most ${MOCK_MAX_ROUTES} mocks.` } }
  for (let i = 0; i < routes.length; i++) {
    const errors = validateMockRoute(routes[i], routes.slice(0, i))
    if (Object.keys(errors).length > 0) return { index: i, errors }
  }
  return null
}

/** Matches a request path (no query string) against a route path pattern. */
export function mockPathMatches(pattern: string, requestPath: string): boolean {
  const pat = pattern.trim().replace(/\/+$/, '').split('/')
  const req = requestPath.replace(/\/+$/, '').split('/')
  for (let i = 0; i < pat.length; i++) {
    if (pat[i] === '*' && i === pat.length - 1) return req.length >= pat.length
    if (i >= req.length) return false
    if (pat[i].startsWith(':') && req[i] !== '') continue
    if (pat[i] !== req[i]) return false
  }
  return pat.length === req.length
}
