import { useCallback, useEffect, useState } from 'react'
import type { MockRoute } from '../../../models/mockServer'
import { mockServerService } from '../../../services/mockServerService'

/** Loads mock routes when the modal opens and persists every change to the dev server. */
export function useMockRoutes(isOpen: boolean) {
  const [routes, setRoutes] = useState<MockRoute[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRoutes(await mockServerService.list())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load mocks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) void reload()
  }, [isOpen, reload])

  /** Saves the full list; returns true on success so callers can close their form. */
  const persist = useCallback(async (next: MockRoute[]): Promise<boolean> => {
    setSaving(true)
    setError('')
    try {
      setRoutes(await mockServerService.save(next))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save mocks.')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const upsert = (route: MockRoute) =>
    persist(routes.some((r) => r.id === route.id) ? routes.map((r) => (r.id === route.id ? route : r)) : [...routes, route])

  const toggle = (id: string) => persist(routes.map((r) => (r.id === id ? { ...r, active: !r.active } : r)))

  const remove = (id: string) => persist(routes.filter((r) => r.id !== id))

  return { routes, loading, saving, error, reload, upsert, toggle, remove }
}
