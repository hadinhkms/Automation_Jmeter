import type { Plugin, ViteDevServer, Connect } from 'vite'
import type { ServerResponse } from 'node:http'
import { handleDebugProxy } from './routes/debugProxyRouter'
import { handleMockRoutesApi, handleMockServe } from './routes/mockServerRouter'
import { handleRunnerRoutes } from './routes/runnerRoutes'
import { handlePluginsRoutes } from './routes/pluginsRoutes'
import { handleAssetRoutes } from './routes/assetRoutes'
import { handleHeadlessRoutes } from './routes/headlessRoutes'
import { handleGitRoutes } from './routes/gitRoutes'
import { handleRecorderRoutes } from './routes/recorderRoutes'
import { handleReportRoutes, serveUserGuide } from './routes/reportRoutes'
import type { RouteHandler } from './routes/routeUtils'

/** Route groups in match order; the report route (prefix match, any method) must stay last. */
const ROUTE_GROUPS: RouteHandler[] = [
  handleRunnerRoutes,
  handlePluginsRoutes,
  handleAssetRoutes,
  handleHeadlessRoutes,
  handleGitRoutes,
  handleRecorderRoutes,
  handleMockRoutesApi,
  handleReportRoutes,
]

export function jmeterPlugin(): Plugin {
  return {
    name: 'vite-plugin-jmeter-runner',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        const url = req.url || ''

        if (url === '/user-guide') {
          if (!serveUserGuide(res)) return next()
          return
        }

        // Local Mock Server (FEAT-P4): /mock/* endpoints for load-test stubs
        if (await handleMockServe(req, res)) return

        if (!url.startsWith('/api/jmeter')) {
          return next()
        }

        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        // 0. Postman 1-Click Debug Proxy
        if (await handleDebugProxy(req, res)) {
          return
        }

        for (const handle of ROUTE_GROUPS) {
          if (await handle(req, res, url)) return
        }

        next()
      })
    },
  }
}
