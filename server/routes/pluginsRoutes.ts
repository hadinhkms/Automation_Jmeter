import { jmeterPluginsManager } from '../pluginsManager'
import { parseJsonBody, statusFromError } from '../httpUtils'
import { errorMessage, sendJson, type RouteHandler } from './routeUtils'

/** 7. Plugins Manager APIs: list / install / uninstall. */
export const handlePluginsRoutes: RouteHandler = async (req, res, url) => {
  if (url === '/api/jmeter/plugins' && req.method === 'GET') {
    const state = await jmeterPluginsManager.getPluginsState()
    sendJson(res, state)
    return true
  }

  if (url === '/api/jmeter/plugins/install' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const pluginId = typeof body.pluginId === 'string' ? body.pluginId : ''
      if (!pluginId) {
        sendJson(res, { error: 'Missing pluginId' }, 400)
        return true
      }
      const result = await jmeterPluginsManager.installPlugin(pluginId)
      sendJson(res, result)
    } catch (err) {
      sendJson(res, { error: errorMessage(err, 'Failed to install plugin.') }, statusFromError(err))
    }
    return true
  }

  if (url === '/api/jmeter/plugins/uninstall' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const pluginId = typeof body.pluginId === 'string' ? body.pluginId : ''
      const jarPath = typeof body.jarPath === 'string' ? body.jarPath : undefined
      const result = await jmeterPluginsManager.uninstallPlugin(pluginId, jarPath)
      sendJson(res, result)
    } catch (err) {
      sendJson(res, { error: errorMessage(err, 'Failed to uninstall plugin.') }, statusFromError(err))
    }
    return true
  }

  return false
}
