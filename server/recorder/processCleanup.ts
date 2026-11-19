import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'

/**
 * Sends SIGTERM, then after 1s SIGKILL to whatever process `getCurrent()` returns
 * (mirrors the original manager, which re-read its field inside the timer).
 */
export function terminateBrowser(browserProcess: ChildProcess, getCurrent: () => ChildProcess | null): void {
  try {
    browserProcess.kill('SIGTERM')
    setTimeout(() => {
      const current = getCurrent()
      if (current && !current.killed) {
        try {
          current.kill('SIGKILL')
        } catch {
          // Ignore process kill error
        }
      }
    }, 1000)
  } catch {
    // Ignore process term error
  }
}

/** Async retry cleanup for Windows file locks. */
export function scheduleProfileDirRemoval(dirToDelete: string): void {
  setTimeout(() => {
    try {
      if (existsSync(dirToDelete)) {
        rmSync(dirToDelete, { recursive: true, force: true })
      }
    } catch {
      // Retry after 3s if Windows file lock is still releasing
      setTimeout(() => {
        try {
          if (existsSync(dirToDelete)) {
            rmSync(dirToDelete, { recursive: true, force: true })
          }
        } catch {
          // Ignore persistent temp lock
        }
      }, 3000)
    }
  }, 1500)
}

/** Launches the visible browser window, detached from the dev server. */
export function launchBrowser(executable: string, args: string[]): ChildProcess {
  return spawn(executable, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  })
}
