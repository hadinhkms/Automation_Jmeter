import { existsSync, readdirSync, statSync, rmSync } from 'node:fs'
import { join } from 'node:path'

/** Deletes the oldest `run_*` folders so at most `maxKeep` remain. Returns how many were removed. */
export function cleanOldRunDirs(runsBaseDir: string, maxKeep = 10): number {
  try {
    if (!existsSync(runsBaseDir)) return 0
    const entries = readdirSync(runsBaseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('run_'))
      .map((d) => {
        const fullPath = join(runsBaseDir, d.name)
        let mtime = 0
        try {
          mtime = statSync(fullPath).mtimeMs
        } catch {
          mtime = 0
        }
        return { name: d.name, path: fullPath, mtime }
      })
      .sort((a, b) => b.mtime - a.mtime)

    if (entries.length > maxKeep) {
      const toDelete = entries.slice(maxKeep)
      for (const item of toDelete) {
        try {
          rmSync(item.path, { recursive: true, force: true })
        } catch (err) {
          console.warn(`[JMeterRunner] Failed to clean old run ${item.name}:`, err)
        }
      }
      return toDelete.length
    }
  } catch (err) {
    console.warn('[JMeterRunner] Failed during cleanOldRuns:', err)
  }
  return 0
}

/** Newest `run_*` folder name (lexicographic = chronological for run_<timestamp>), or undefined. */
export function findLatestRunId(runsBaseDir: string): string | undefined {
  if (!existsSync(runsBaseDir)) return undefined
  const runs = readdirSync(runsBaseDir)
    .filter((f) => f.startsWith('run_'))
    .sort()
    .reverse()
  return runs.length > 0 ? runs[0] : undefined
}
