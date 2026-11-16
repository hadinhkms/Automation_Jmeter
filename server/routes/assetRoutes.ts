import { existsSync, statSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join, basename, normalize } from 'node:path'
import { parseJsonBody, statusFromError } from '../httpUtils'
import { errorMessage, sendJson, type RouteHandler } from './routeUtils'

const ASSET_DIRS = ['data', 'downloads', 'attachments']

function sanitizeAssetFileName(fileName: string): string {
  const base = basename(fileName)
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/[\x00-\x1f]/g, '_') // eslint-disable-line no-control-regex
    .trim()
  return base || `asset_${Date.now()}`
}

function safeAssetDir(targetDir: unknown): string {
  const requested = typeof targetDir === 'string' ? targetDir : 'data'
  return requested === 'downloads' || requested === 'attachments' ? requested : 'data'
}

function resolveSafeAssetPath(relativePath: unknown): string | null {
  if (typeof relativePath !== 'string' || !relativePath.trim()) return null

  const normalized = relativePath.replace(/\\/g, '/')
  const [dir, ...rest] = normalized.split('/')
  if (!ASSET_DIRS.includes(dir) || rest.length !== 1) return null

  const safeName = sanitizeAssetFileName(rest[0])
  if (!safeName || safeName !== rest[0]) return null

  const fullPath = normalize(join(process.cwd(), dir, safeName))
  const allowedDir = normalize(join(process.cwd(), dir))
  return fullPath.startsWith(allowedDir) ? fullPath : null
}

function listAssets() {
  return ASSET_DIRS.flatMap((dir) => {
    const fullDir = join(process.cwd(), dir)
    if (!existsSync(fullDir)) return []
    return readdirSync(fullDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const filePath = join(fullDir, entry.name)
        const stat = statSync(filePath)
        return {
          fileName: entry.name,
          relativePath: `${dir}/${entry.name}`.replace(/\\/g, '/'),
          size: stat.size,
          updatedAt: stat.mtimeMs,
        }
      })
  })
}

/** 8. Project asset APIs: list / upload / delete files in data, downloads, attachments. */
export const handleAssetRoutes: RouteHandler = async (req, res, url) => {
  if (url === '/api/jmeter/assets' && req.method === 'GET') {
    sendJson(res, { assets: listAssets() })
    return true
  }

  if (url === '/api/jmeter/assets/upload' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const fileName = typeof body.fileName === 'string' ? body.fileName : ''
      const contentBase64 = typeof body.contentBase64 === 'string' ? body.contentBase64 : ''
      if (!fileName || !contentBase64) {
        sendJson(res, { error: 'Missing fileName or contentBase64.' }, 400)
        return true
      }

      const targetDir = safeAssetDir(body.targetDir)
      const safeName = sanitizeAssetFileName(fileName)
      const targetPath = join(process.cwd(), targetDir, safeName)
      mkdirSync(join(process.cwd(), targetDir), { recursive: true })
      const buffer = Buffer.from(contentBase64, 'base64')
      writeFileSync(targetPath, buffer)

      sendJson(res, {
        success: true,
        fileName: safeName,
        relativePath: `${targetDir}/${safeName}`.replace(/\\/g, '/'),
        size: buffer.length,
      })
    } catch (err) {
      sendJson(res, { error: errorMessage(err, 'Failed to upload asset.') }, statusFromError(err))
    }
    return true
  }

  if (url === '/api/jmeter/assets/delete' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const targetPath = resolveSafeAssetPath(body.relativePath)

      if (!targetPath || !existsSync(targetPath) || !statSync(targetPath).isFile()) {
        sendJson(res, { error: 'Asset file was not found.' }, 404)
        return true
      }

      unlinkSync(targetPath)
      sendJson(res, { success: true })
    } catch (err) {
      sendJson(res, { error: errorMessage(err, 'Failed to delete asset.') }, statusFromError(err))
    }
    return true
  }

  return false
}
