import type { ServerResponse } from 'node:http'
import { existsSync, createReadStream, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { jmeterRunner } from '../jmeterRunner'
import { requestUrl, type RouteHandler } from './routeUtils'

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

/** Serves docs/index.html at /user-guide; returns false when the guide does not exist. */
export function serveUserGuide(res: ServerResponse): boolean {
  const guidePath = join(process.cwd(), 'docs', 'index.html')
  if (!existsSync(guidePath)) return false
  res.setHeader('Content-Type', mimeTypes['.html'])
  createReadStream(guidePath).pipe(res)
  return true
}

/** Serves files of the generated HTML dashboard report: /api/jmeter/report/<runId>/<subPath>. */
export const handleReportRoutes: RouteHandler = async (req, res, url) => {
  if (!url.startsWith('/api/jmeter/report')) return false

  const u = requestUrl(req, url)
  const pathParts = u.pathname.replace(/^\/api\/jmeter\/report\/?/, '').split('/')
  const runId = pathParts[0] || jmeterRunner.getStatus().lastSummary?.runId || ''
  const subPath = pathParts.slice(1).join('/') || 'index.html'

  if (!runId) {
    res.statusCode = 404
    res.end('No report found.')
    return true
  }

  const filePath = join(process.cwd(), 'runs', runId, 'report', subPath)
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath).toLowerCase()
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    createReadStream(filePath).pipe(res)
    return true
  }

  res.statusCode = 404
  res.end(`Report file not found: ${subPath}`)
  return true
}
