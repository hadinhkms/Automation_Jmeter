import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { isPatternPath, MOCK_METHODS, mockPathMatches, type MockMethod, type MockRoute } from '../../src/models/mockServer'

/** Local, gitignored store for mock routes; survives dev-server restarts. Tests override the path. */
function storeFile(): string {
  return process.env.JMETER_MOCK_ROUTES_FILE || join(process.cwd(), '.jmeter-web', 'mock-routes.json')
}

let cache: MockRoute[] | null = null

function toRoute(raw: unknown): MockRoute | null {
  if (!raw || typeof raw !== 'object') return null
  // SAFETY: raw is checked above to be a non-null object; each field is type-checked below
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.path !== 'string') return null
  // SAFETY: includes() only tests membership; the value is used only when it is a listed method
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

const FIELD_TYPES: Array<[string, 'string' | 'number' | 'boolean', boolean]> = [
  ['id', 'string', true], ['path', 'string', true], ['method', 'string', false], ['status', 'number', true],
  ['delayMs', 'number', true], ['contentType', 'string', false], ['body', 'string', false], ['active', 'boolean', false],
]

/** Strict type check for API input (no coercion); returns the first error with its index, or null. */
export function findRouteTypeError(raw: unknown[]): { index: number; error: string } | null {
  for (let index = 0; index < raw.length; index++) {
    const item = raw[index]
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { index, error: `Route ${index} must be an object.` }
    // SAFETY: item is checked above to be a non-null, non-array object; fields are only read for typeof checks
    const r = item as Record<string, unknown>
    for (const [field, type, required] of FIELD_TYPES) {
      if (r[field] === undefined && !required) continue
      if (typeof r[field] !== type) return { index, error: `Route ${index}: "${field}" must be a ${type}.` }
    }
  }
  return null
}

/** Normalises untrusted JSON into routes; invalid entries are dropped. */
export function normaliseRoutes(raw: unknown): MockRoute[] {
  if (!Array.isArray(raw)) return []
  return raw.map(toRoute).filter((r): r is MockRoute => r !== null)
}

/** Moves an unreadable store aside so the next save cannot silently overwrite the user's data. */
function quarantineCorruptStore(file: string, err: unknown): void {
  const target = `${file}.corrupt-${Date.now()}`
  try {
    renameSync(file, target)
    console.warn(`[mock-server] ${file} could not be parsed (${err instanceof Error ? err.message : String(err)}); moved to ${target}`)
  } catch (renameErr) {
    console.warn(`[mock-server] ${file} could not be parsed and could not be moved aside:`, renameErr)
  }
}

export function loadMockRoutes(): MockRoute[] {
  if (cache) return cache
  const file = storeFile()
  if (!existsSync(file)) return (cache = [])
  try {
    cache = normaliseRoutes(JSON.parse(readFileSync(file, 'utf-8')))
  } catch (err) {
    quarantineCorruptStore(file, err)
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

/** First active route whose method and raw (still-encoded) path match; exact paths win over patterns. HEAD uses GET routes. */
export function findMockRoute(routes: MockRoute[], method: string, rawPath: string): MockRoute | undefined {
  const upper = method.toUpperCase() === 'HEAD' ? 'GET' : method.toUpperCase()
  const candidates = routes.filter(
    (r) => r.active && (r.method === 'ANY' || r.method === upper) && mockPathMatches(r.path, rawPath),
  )
  return candidates.find((r) => !isPatternPath(r.path)) ?? candidates[0]
}
