import { parseJtlContent } from '../../../utils/jtlParser'
import { useJMeterStore } from '../../../store/jmeterStore'

/** Returns a handler that parses a dropped/browsed JTL/CSV file and loads it as the current run results. */
export function useJtlImport() {
  const store = useJMeterStore()

  return async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseJtlContent(text)
      if (parsed.samples.length > 0) {
        store.setRunResults({
          samples: parsed.samples,
          summaryRows: parsed.summaryRows,
          aggregateRows: parsed.aggregateRows,
          hasReport: false,
          runId: file.name.replace(/\.[^.]+$/, ''),
        })
      }
    } catch {
      // ignore
    }
  }
}
