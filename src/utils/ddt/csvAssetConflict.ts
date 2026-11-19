/** Detects when uploading a CSV would overwrite an existing project asset (server/routes/assetRoutes.ts naming rules). */
import type { ProjectAsset } from '../../services/projectAssetService'

/** Same file-name sanitising as the asset upload route, so the predicted path matches what the server writes. */
export function predictAssetPath(fileName: string, targetDir = 'data'): string {
  const base = (fileName.split(/[\\/]/).pop() ?? '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/[\x00-\x1f]/g, '_') // eslint-disable-line no-control-regex
    .trim()
  return `${targetDir}/${base}`
}

/** Existing asset at the same path (case-insensitive: Windows file systems are), or null. */
export function findConflictingAsset(assets: ProjectAsset[], fileName: string, targetDir = 'data'): ProjectAsset | null {
  const target = predictAssetPath(fileName, targetDir).toLowerCase()
  return assets.find((asset) => asset.relativePath.replace(/\\/g, '/').toLowerCase() === target) ?? null
}

export function overwritePrompt(asset: ProjectAsset): string {
  return `${asset.relativePath} already exists in this project. Overwrite it with the new file? Other CSV Data Sets that use it will read the new data.`
}
