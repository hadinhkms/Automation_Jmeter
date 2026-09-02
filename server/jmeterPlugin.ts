import type { Plugin, ViteDevServer, Connect } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, createReadStream, statSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join, extname, basename, normalize } from 'node:path'
import { execSync } from 'node:child_process'
import { jmeterRunner } from './jmeterRunner'
import { jmeterPluginsManager } from './pluginsManager'
import { browserRecorder } from './browserRecorder'
import { sendWebhookNotification } from './webhookNotifier'

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

function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer | string) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

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
  if (!['data', 'downloads', 'attachments'].includes(dir) || rest.length !== 1) return null

  const safeName = sanitizeAssetFileName(rest[0])
  if (!safeName || safeName !== rest[0]) return null

  const fullPath = normalize(join(process.cwd(), dir, safeName))
  const allowedDir = normalize(join(process.cwd(), dir))
  return fullPath.startsWith(allowedDir) ? fullPath : null
}

export function jmeterPlugin(): Plugin {
  return {
    name: 'vite-plugin-jmeter-runner',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        const url = req.url || ''

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

        // 1. Detect JMeter
        if (url === '/api/jmeter/detect' && req.method === 'GET') {
          const result = jmeterRunner.detectJMeter()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
          return
        }

        // 2. Configure Custom Path
        if (url === '/api/jmeter/config' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const customPath = typeof body.path === 'string' ? body.path : ''
            jmeterRunner.setCustomPath(customPath)
            const detection = jmeterRunner.detectJMeter()
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, detection }))
          } catch (err) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid request' }))
          }
          return
        }

        // 3. Status
        if (url === '/api/jmeter/status' && req.method === 'GET') {
          const status = jmeterRunner.getStatus()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(status))
          return
        }

        // 4. Start Run
        if (url === '/api/jmeter/run' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const jmx = typeof body.jmx === 'string' ? body.jmx : ''
            const name = typeof body.name === 'string' ? body.name : 'test_plan'

            if (!jmx) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing JMX content.' }))
              return
            }

            const remoteHosts = body.remoteHosts as string[] | string | undefined
            const { runId, reportDir } = await jmeterRunner.startRun(jmx, name, { remoteHosts })
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, runId, reportDir }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to start run.' }))
          }
          return
        }

        // 5. Stop Run
        if (url === '/api/jmeter/stop' && req.method === 'POST') {
          const result = jmeterRunner.stopRun()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
          return
        }

        // 6. Get Results
        if (url.startsWith('/api/jmeter/results') && req.method === 'GET') {
          const u = new URL(url, `http://${req.headers.host || 'localhost'}`)
          const runId = u.searchParams.get('runId') || undefined
          const results = jmeterRunner.getRunResults(runId)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(results || { error: 'No results found' }))
          return
        }

        // 7. Plugins Manager APIs
        if (url === '/api/jmeter/plugins' && req.method === 'GET') {
          const state = jmeterPluginsManager.getPluginsState()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(state))
          return
        }

        if (url === '/api/jmeter/plugins/install' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const pluginId = typeof body.pluginId === 'string' ? body.pluginId : ''
            if (!pluginId) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing pluginId' }))
              return
            }
            const result = await jmeterPluginsManager.installPlugin(pluginId)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to install plugin.' }))
          }
          return
        }

        if (url === '/api/jmeter/plugins/uninstall' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const pluginId = typeof body.pluginId === 'string' ? body.pluginId : ''
            const jarPath = typeof body.jarPath === 'string' ? body.jarPath : undefined
            const result = jmeterPluginsManager.uninstallPlugin(pluginId, jarPath)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to uninstall plugin.' }))
          }
          return
        }

        // 8. Project asset APIs
        if (url === '/api/jmeter/assets' && req.method === 'GET') {
          const dirs = ['data', 'downloads', 'attachments']
          const assets = dirs.flatMap((dir) => {
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
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ assets }))
          return
        }

        if (url === '/api/jmeter/assets/upload' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const fileName = typeof body.fileName === 'string' ? body.fileName : ''
            const contentBase64 = typeof body.contentBase64 === 'string' ? body.contentBase64 : ''
            if (!fileName || !contentBase64) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing fileName or contentBase64.' }))
              return
            }

            const targetDir = safeAssetDir(body.targetDir)
            const safeName = sanitizeAssetFileName(fileName)
            const targetPath = join(process.cwd(), targetDir, safeName)
            mkdirSync(join(process.cwd(), targetDir), { recursive: true })
            const buffer = Buffer.from(contentBase64, 'base64')
            writeFileSync(targetPath, buffer)

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              success: true,
              fileName: safeName,
              relativePath: `${targetDir}/${safeName}`.replace(/\\/g, '/'),
              size: buffer.length,
            }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to upload asset.' }))
          }
          return
        }

        if (url === '/api/jmeter/assets/delete' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const targetPath = resolveSafeAssetPath(body.relativePath)

            if (!targetPath || !existsSync(targetPath) || !statSync(targetPath).isFile()) {
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Asset file was not found.' }))
              return
            }

            unlinkSync(targetPath)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to delete asset.' }))
          }
          return
        }

        // --- CI/CD Headless Run & SLA Quality Gates ---
        if (url === '/api/jmeter/run-headless' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const jmx = typeof body.jmx === 'string' ? body.jmx : ''
            const name = typeof body.name === 'string' ? body.name : 'headless_test'
            const slaThresholds = (body.slaThresholds as Record<string, unknown>) || {}
            const webhook = (body.webhook as Record<string, unknown>) || {}
            const remoteHosts = body.remoteHosts as string[] | string | undefined

            if (!jmx) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing JMX content.' }))
              return
            }

            const { runId, reportDir } = await jmeterRunner.startRun(jmx, name, { remoteHosts })

            // Await execution finish
            const summary = await new Promise<any>((resolve) => {
              const onDone = (resSummary: any) => {
                if (resSummary.runId === runId) {
                  jmeterRunner.off('complete', onDone)
                  jmeterRunner.off('stopped', onDone)
                  jmeterRunner.off('error', onDone)
                  resolve(resSummary)
                }
              }
              jmeterRunner.on('complete', onDone)
              jmeterRunner.on('stopped', onDone)
              jmeterRunner.on('error', onDone)
            })

            const totalSamples = summary.totalSamples || (summary.samples ? summary.samples.length : 0)
            const errors = summary.samples ? summary.samples.filter((s: any) => !s.success).length : 0
            const errorRate = totalSamples > 0 ? (errors / totalSamples) * 100 : 0
            const elapseds = summary.samples ? summary.samples.map((s: any) => s.elapsed).sort((a: number, b: number) => a - b) : []
            const sum = elapseds.reduce((a: number, b: number) => a + b, 0)
            const avg = elapseds.length > 0 ? Math.round(sum / elapseds.length) : 0
            const p90 = elapseds.length > 0 ? elapseds[Math.floor(elapseds.length * 0.9)] || elapseds[elapseds.length - 1] : 0
            const p95 = elapseds.length > 0 ? elapseds[Math.floor(elapseds.length * 0.95)] || elapseds[elapseds.length - 1] : 0

            let slaPassed = true
            const failedRules: string[] = []
            if (slaThresholds && slaThresholds.enabled) {
              if (slaThresholds.maxAvgLatencyMs && avg > Number(slaThresholds.maxAvgLatencyMs)) {
                failedRules.push(`Avg Latency (${avg}ms > ${slaThresholds.maxAvgLatencyMs}ms)`)
              }
              if (slaThresholds.maxP95LatencyMs && p95 > Number(slaThresholds.maxP95LatencyMs)) {
                failedRules.push(`P95 Latency (${p95}ms > ${slaThresholds.maxP95LatencyMs}ms)`)
              }
              if (slaThresholds.maxErrorRatePercent !== undefined && errorRate > Number(slaThresholds.maxErrorRatePercent)) {
                failedRules.push(`Error Rate (${errorRate.toFixed(2)}% > ${slaThresholds.maxErrorRatePercent}%)`)
              }
              slaPassed = failedRules.length === 0
            }

            const slaSummary = failedRules.length === 0 ? 'All SLA Quality Gates passed!' : `SLA Failed: ${failedRules.join(', ')}`

            // Send webhook if configured
            if (webhook && webhook.enabled && webhook.url) {
              if ((slaPassed && webhook.notifyOnPass) || (!slaPassed && webhook.notifyOnFail)) {
                await sendWebhookNotification(String(webhook.url), (webhook.type as any) || 'discord', {
                  testName: name,
                  runId,
                  status: slaPassed ? 'passed' : 'failed',
                  totalSamples,
                  errors,
                  errorRate,
                  avgLatency: avg,
                  p90Latency: p90,
                  p95Latency: p95,
                  throughput: totalSamples / Math.max(1, 10),
                  durationSeconds: 10,
                  slaSummary,
                })
              }
            }

            const exitCode = summary.status === 'failed' ? 2 : slaPassed ? 0 : 1
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              exitCode,
              slaPassed,
              runId,
              reportDir,
              summary: {
                totalSamples,
                errors,
                errorRate,
                avgLatency: avg,
                p90Latency: p90,
                p95Latency: p95,
                slaSummary,
              },
            }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ exitCode: 2, error: err instanceof Error ? err.message : 'Headless execution error' }))
          }
          return
        }

        // --- Webhook Test Endpoint ---
        if (url === '/api/jmeter/test-webhook' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const webhookUrl = typeof body.url === 'string' ? body.url : ''
            const webhookType = (body.type as any) || 'discord'
            if (!webhookUrl) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing webhook URL' }))
              return
            }
            const result = await sendWebhookNotification(webhookUrl, webhookType, {
              testName: 'Smoke Test Plan (Verification Test)',
              runId: `test_${Date.now()}`,
              status: 'passed',
              totalSamples: 1500,
              errors: 0,
              errorRate: 0,
              avgLatency: 85,
              p90Latency: 120,
              p95Latency: 165,
              p99Latency: 210,
              throughput: 250.0,
              durationSeconds: 30,
              slaSummary: 'All 4 SLA quality gate rules passed successfully!',
            })
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Webhook error' }))
          }
          return
        }

        // --- Git Version Control APIs ---
        if (url === '/api/jmeter/git/status' && req.method === 'GET') {
          try {
            let branch = 'main'
            try {
              branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim() || 'main'
            } catch {
              branch = 'master'
            }

            let lines: string[] = []
            try {
              const porcelain = execSync('git status --porcelain=v1', { encoding: 'utf-8' })
              lines = porcelain.split('\n').filter(Boolean)
            } catch {
              lines = []
            }

            const files = lines.map((l) => {
              const code = l.substring(0, 2).trim()
              const path = l.substring(3).trim()
              let status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed' = 'modified'
              if (code === '??') status = 'untracked'
              else if (code === 'A') status = 'added'
              else if (code === 'D') status = 'deleted'
              else if (code === 'R') status = 'renamed'
              return { path, status }
            })

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ branch, clean: files.length === 0, files, ahead: 0, behind: 0 }))
          } catch (err) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ branch: 'local', clean: true, files: [], ahead: 0, behind: 0, error: String(err) }))
          }
          return
        }

        if (url === '/api/jmeter/git/commit' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const message = typeof body.message === 'string' ? body.message : 'Update JMeter Test Plan'
            execSync('git add .', { stdio: 'pipe' })
            const output = execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { encoding: 'utf-8', stdio: 'pipe' })
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, output }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }))
          }
          return
        }

        if (url === '/api/jmeter/git/push' && req.method === 'POST') {
          try {
            const output = execSync('git push', { encoding: 'utf-8', timeout: 15000, stdio: 'pipe' })
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, message: output }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }))
          }
          return
        }

        if (url === '/api/jmeter/git/pull' && req.method === 'POST') {
          try {
            const output = execSync('git pull', { encoding: 'utf-8', timeout: 15000, stdio: 'pipe' })
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, message: output }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }))
          }
          return
        }

        if (url.startsWith('/api/jmeter/git/diff') && req.method === 'GET') {
          try {
            const u = new URL(url, `http://${req.headers.host || 'localhost'}`)
            const targetFile = u.searchParams.get('file') || ''
            const cmd = targetFile ? `git diff HEAD -- "${targetFile}"` : 'git diff HEAD'
            let diff = ''
            try {
              diff = execSync(cmd, { encoding: 'utf-8' })
            } catch {
              diff = 'No diff found or untracked file.'
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ diff }))
          } catch (err) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ diff: '', error: String(err) }))
          }
          return
        }

        // 9. SSE Live Stream
        if (url === '/api/jmeter/stream' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          })

          const sendEvent = (event: string, data: unknown) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          }

          const onStart = (data: unknown) => sendEvent('start', data)
          const onLog = (data: unknown) => sendEvent('log', data)
          const onProgress = (data: unknown) => sendEvent('progress', data)
          const onSamples = (data: unknown) => sendEvent('samples', data)
          const onComplete = (data: unknown) => sendEvent('complete', data)
          const onStopped = (data: unknown) => sendEvent('stopped', data)
          const onError = (data: unknown) => sendEvent('error', data)

          jmeterRunner.on('start', onStart)
          jmeterRunner.on('log', onLog)
          jmeterRunner.on('progress', onProgress)
          jmeterRunner.on('samples', onSamples)
          jmeterRunner.on('complete', onComplete)
          jmeterRunner.on('stopped', onStopped)
          jmeterRunner.on('error', onError)

          sendEvent('connected', { status: jmeterRunner.getStatus() })

          req.on('close', () => {
            jmeterRunner.off('start', onStart)
            jmeterRunner.off('log', onLog)
            jmeterRunner.off('progress', onProgress)
            jmeterRunner.off('samples', onSamples)
            jmeterRunner.off('complete', onComplete)
            jmeterRunner.off('stopped', onStopped)
            jmeterRunner.off('error', onError)
          })
          return
        }

        // --- Browser Recorder APIs ---

        // A. Detect available browsers
        if (url === '/api/jmeter/recorder/browsers' && req.method === 'GET') {
          const detection = browserRecorder.detectBrowsers()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(detection))
          return
        }

        // B. Get Recorder Status & captured requests
        if (url === '/api/jmeter/recorder/status' && req.method === 'GET') {
          const status = browserRecorder.getStatus()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(status))
          return
        }

        // C. Start Recording
        if (url === '/api/jmeter/recorder/start' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const browserType = (body.browserType as 'chrome' | 'edge' | 'custom') || 'chrome'
            const browserPath = typeof body.browserPath === 'string' ? body.browserPath : undefined
            const targetUrl = typeof body.targetUrl === 'string' ? body.targetUrl : 'about:blank'
            const initialTransaction = typeof body.initialTransaction === 'string' ? body.initialTransaction : '01_Action'
            const port = typeof body.port === 'number' ? body.port : undefined

            const result = await browserRecorder.startRecording({
              browserType,
              browserPath,
              targetUrl,
              initialTransaction,
              port,
            })

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to launch browser recorder.' }))
          }
          return
        }

        // D. Stop Recording
        if (url === '/api/jmeter/recorder/stop' && req.method === 'POST') {
          try {
            const result = await browserRecorder.stopRecording()
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to stop recorder.' }))
          }
          return
        }

        // E. Change current transaction name
        if (url === '/api/jmeter/recorder/transaction' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req)
            const name = typeof body.name === 'string' ? body.name : 'Default Transaction'
            browserRecorder.setTransaction(name)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, transaction: name }))
          } catch (err) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid request.' }))
          }
          return
        }

        // F. Clear recorded requests
        if (url === '/api/jmeter/recorder/clear' && req.method === 'POST') {
          browserRecorder.clearRequests()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true }))
          return
        }

        // G. Live SSE Stream for Browser Recorder
        if (url === '/api/jmeter/recorder/stream' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          })

          const sendRecorderEvent = (event: string, data: unknown) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          }

          const onRequestAdded = (data: unknown) => sendRecorderEvent('request-added', data)
          const onRequestUpdated = (data: unknown) => sendRecorderEvent('request-updated', data)
          const onStarted = (data: unknown) => sendRecorderEvent('started', data)
          const onStopped = (data: unknown) => sendRecorderEvent('stopped', data)
          const onCleared = () => sendRecorderEvent('cleared', {})
          const onTransactionChanged = (data: unknown) => sendRecorderEvent('transaction-changed', data)

          browserRecorder.on('request-added', onRequestAdded)
          browserRecorder.on('request-updated', onRequestUpdated)
          browserRecorder.on('started', onStarted)
          browserRecorder.on('stopped', onStopped)
          browserRecorder.on('cleared', onCleared)
          browserRecorder.on('transaction-changed', onTransactionChanged)

          sendRecorderEvent('connected', { status: browserRecorder.getStatus() })

          // Keep-alive heartbeat every 15s to prevent timeout
          const heartbeatTimer = setInterval(() => {
            try {
              res.write(': ping\n\n')
            } catch {
              return
            }
          }, 15000)

          req.on('close', () => {
            clearInterval(heartbeatTimer)
            browserRecorder.off('request-added', onRequestAdded)
            browserRecorder.off('request-updated', onRequestUpdated)
            browserRecorder.off('started', onStarted)
            browserRecorder.off('stopped', onStopped)
            browserRecorder.off('cleared', onCleared)
            browserRecorder.off('transaction-changed', onTransactionChanged)
          })
          return
        }

        // 8. Serve Generated HTML Dashboard Report
        if (url.startsWith('/api/jmeter/report')) {
          const u = new URL(url, `http://${req.headers.host || 'localhost'}`)
          const pathParts = u.pathname.replace(/^\/api\/jmeter\/report\/?/, '').split('/')
          const runId = pathParts[0] || jmeterRunner.getStatus().lastSummary?.runId || ''
          const subPath = pathParts.slice(1).join('/') || 'index.html'

          if (!runId) {
            res.statusCode = 404
            res.end('No report found.')
            return
          }

          const filePath = join(process.cwd(), 'runs', runId, 'report', subPath)
          if (existsSync(filePath) && statSync(filePath).isFile()) {
            const ext = extname(filePath).toLowerCase()
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
            createReadStream(filePath).pipe(res)
            return
          }

          res.statusCode = 404
          res.end(`Report file not found: ${subPath}`)
          return
        }

        // 9. Serve Docs & User Guide HTML
        if (url.startsWith('/docs') || url === '/user-guide') {
          const u = new URL(url, `http://${req.headers.host || 'localhost'}`)
          let subPath = u.pathname.replace(/^\/docs\/?/, '')
          if (!subPath || subPath === 'user-guide') subPath = 'index.html'
          const filePath = join(process.cwd(), 'docs', subPath)
          if (existsSync(filePath) && statSync(filePath).isFile()) {
            const ext = extname(filePath).toLowerCase()
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
            createReadStream(filePath).pipe(res)
            return
          }
        }

        next()
      })
    },
  }
}
