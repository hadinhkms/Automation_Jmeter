import { useCallback, useEffect, useState } from 'react'
import { historyStorageService, type HistoryEntry } from '../../../services/historyStorageService'

/** Live view of the debug request history; reloads whenever an entry is added or removed. */
export function useRequestHistory(enabled: boolean) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setEntries(await historyStorageService.list())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read request history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void reload()
    return historyStorageService.subscribe(() => void reload())
  }, [enabled, reload])

  const remove = (id: string) => historyStorageService.remove(id).catch(() => setError('Could not delete entry.'))
  const clear = () => historyStorageService.clear().catch(() => setError('Could not clear history.'))

  return { entries, loading, error, remove, clear }
}
