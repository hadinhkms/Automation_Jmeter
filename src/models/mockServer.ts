/** Shared (client + dev server) model and validation for the Local Mock Server (FEAT-P4). */
import { mockPathKey, validateContentType, validateMockPath } from './mockPathRules'

export { mockPathMatches, isPatternPath } from './mockPathRules'

export const MOCK_METHODS = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export type MockMethod = (typeof MOCK_METHODS)[number]

export const MOCK_PATH_PREFIX = '/mock/'
export const MOCK_MAX_DELAY_MS = 10000
export const MOCK_MAX_ROUTES = 200
export const MOCK_MAX_BODY_CHARS = 512 * 1024
/** 1xx is excluded: an informational status never completes the response and hangs clients. */
export const MOCK_MIN_STATUS = 200
export const MOCK_MAX_STATUS = 599

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

export type MockRouteField = 'id' | 'method' | 'path' | 'status' | 'delayMs' | 'contentType' | 'body'
export type MockRouteErrors = Partial<Record<MockRouteField, string>>

export function createEmptyMockRoute(id: string): MockRoute {
  return { id, method: 'GET', path: '/mock/', status: 200, delayMs: 0, contentType: 'application/json', body: '{}', active: true }
}

function methodsOverlap(a: MockMethod, b: MockMethod): boolean {
  return a === 'ANY' || b === 'ANY' || a === b
}

/** Validates one route; `others` are the remaining routes, used for the duplicate checks. */
export function validateMockRoute(route: MockRoute, others: MockRoute[] = []): MockRouteErrors {
  const errors: MockRouteErrors = {}
  const path = typeof route.path === 'string' ? route.path.trim() : ''

  if (others.some((o) => o.id === route.id)) errors.id = `Duplicate route id "${route.id}".`
  if (!MOCK_METHODS.includes(route.method)) errors.method = 'Unsupported method.'

  const pathError = validateMockPath(path, MOCK_PATH_PREFIX)
  if (pathError) {
    errors.path = pathError
  } else if (others.some((o) => mockPathKey(o.path) === mockPathKey(path) && methodsOverlap(o.method, route.method))) {
    errors.path = 'Another mock already uses this method and path.'
  }

  if (!Number.isInteger(route.status) || route.status < MOCK_MIN_STATUS || route.status > MOCK_MAX_STATUS) {
    errors.status = `Status must be a whole number from ${MOCK_MIN_STATUS} to ${MOCK_MAX_STATUS}.`
  }

  if (!Number.isInteger(route.delayMs) || route.delayMs < 0 || route.delayMs > MOCK_MAX_DELAY_MS) {
    errors.delayMs = `Delay must be a whole number from 0 to ${MOCK_MAX_DELAY_MS} ms.`
  }

  const contentTypeError = validateContentType(route.contentType)
  if (contentTypeError) errors.contentType = contentTypeError

  const body = typeof route.body === 'string' ? route.body : ''
  if (body.length > MOCK_MAX_BODY_CHARS) {
    errors.body = 'Body is larger than 512 KB.'
  } else if (body.trim() && !contentTypeError && /json/i.test(route.contentType)) {
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
