import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { MOCK_METHODS, mockPathMatches, type MockMethod, type MockRoute } from '../../src/models/mockServer'

/** Local, gitignored store for mock routes; survives dev-server restarts. Tests override the path. */
function storeFile(): string {
  return process.env.JMETER_MOCK_ROUTES_FILE || join(process.cwd(), '.jmeter-web', 'mock-routes.json')
}

let cache: MockRoute[] | null = null

function toRoute(raw: unknown): MockRoute | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.path !== 'string') return null
  const method = MOCK_METHODS.includes(r.method as MockMethod) ? (r.method as MockMethod) : 'GET'
  return {
    id: r.id,
    method,
    path: r.path.trim(),
    status: Number(r.status),
    delayMs: Number(r.delayMs),
    contentType: typeof r.contentType === 'string' && r.contentType.trim() ? r.contentType.trim() : 'application/json',
    body: typeof r.body === 'string' ? r.body : '',
    active: r.active !== false,
  }
}

/** Normalises untrusted JSON into routes; invalid entries are dropped. */
export function normaliseRoutes(raw: unknown): MockRoute[] {
  if (!Array.isArray(raw)) return []
  return raw.map(toRoute).filter((r): r is MockRoute => r !== null)
}

export function loadMockRoutes(): MockRoute[] {
  if (cache) return cache
  try {
    const file = storeFile()
    cache = existsSync(file) ? normaliseRoutes(JSON.parse(readFileSync(file, 'utf-8'))) : []
  } catch {
    cache = []
  }
  return cache
}

export function saveMockRoutes(routes: MockRoute[]): MockRoute[] {
  const file = storeFile()
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(routes, null, 2), 'utf-8')
  renameSync(tmp, file)
  cache = routes
  return routes
}

/** First active route whose method and path match; exact paths win over patterns. */
export function findMockRoute(routes: MockRoute[], method: string, path: string): MockRoute | undefined {
  const upper = method.toUpperCase()
  const candidates = routes.filter(
    (r) => r.active && (r.method === 'ANY' || r.method === upper) && mockPathMatches(r.path, path),
  )
  return candidates.find((r) => r.path.replace(/\/+$/, '') === path.replace(/\/+$/, '')) ?? candidates[0]
}
