import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { BrowserDetection } from '../../src/models/recorder'

export function detectBrowsers(): BrowserDetection {
  const available: Array<{ type: 'chrome' | 'edge' | 'custom'; name: string; path: string }> = []
  const localAppData = process.env.LOCALAPPDATA || ''
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

  const chromeCandidates = [
    join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ]

  const edgeCandidates = [
    join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ]

  let foundChrome: string | undefined
  for (const p of chromeCandidates) {
    if (existsSync(p)) {
      foundChrome = p
      available.push({ type: 'chrome', name: 'Google Chrome', path: p })
      break
    }
  }

  let foundEdge: string | undefined
  for (const p of edgeCandidates) {
    if (existsSync(p)) {
      foundEdge = p
      available.push({ type: 'edge', name: 'Microsoft Edge', path: p })
      break
    }
  }

  return {
    chrome: foundChrome,
    edge: foundEdge,
    available,
  }
}

/** Picks the executable: explicit path, else the requested browser type, else the first detected one. */
export function resolveBrowserExecutable(
  browserType: 'chrome' | 'edge' | 'custom',
  browserPath: string | undefined,
  detection: BrowserDetection,
): string | undefined {
  let executable = browserPath
  if (!executable) {
    if (browserType === 'chrome' && detection.chrome) executable = detection.chrome
    else if (browserType === 'edge' && detection.edge) executable = detection.edge
    else if (detection.available.length > 0) executable = detection.available[0].path
  }
  return executable
}
