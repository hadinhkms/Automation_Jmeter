import type { MockRoute, MockRouteErrors } from '../models/mockServer'

const ROUTES_API = '/api/jmeter/mock/routes'

/** Raised when the dev server rejects a save; `index`/`errors` point at the failing route. */
export class MockSaveError extends Error {
  constructor(message: string, public readonly index?: number, public readonly errors?: MockRouteErrors) {
    super(message)
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

class MockServerService {
  async list(): Promise<MockRoute[]> {
    const response = await fetch(ROUTES_API)
    const data = await readJson(response)
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `Could not load mocks (HTTP ${response.status}).`)
    return Array.isArray(data.routes) ? (data.routes as MockRoute[]) : []
  }

  /** Replaces the full list on the server; resolves with what the server stored. */
  async save(routes: MockRoute[]): Promise<MockRoute[]> {
    const response = await fetch(ROUTES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
    })
    const data = await readJson(response)
    if (!response.ok) {
      const message = typeof data.error === 'string' ? data.error : `Could not save mocks (HTTP ${response.status}).`
      throw new MockSaveError(message, typeof data.index === 'number' ? data.index : undefined, data.errors as MockRouteErrors | undefined)
    }
    return Array.isArray(data.routes) ? (data.routes as MockRoute[]) : routes
  }

  /** Absolute URL a JMeter sampler should call for this mock path. */
  urlFor(path: string): string {
    return `${window.location.origin}${path}`
  }
}

export const mockServerService = new MockServerService()
