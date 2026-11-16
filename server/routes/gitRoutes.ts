import { execSync } from 'node:child_process'
import { computeJmxDiff } from '../jmxDiffEngine'
import { parseJsonBody, statusFromError } from '../httpUtils'
import { gitCheckout, gitCommitAll, gitDiff, isSafeBranchName, isSafeRelativePath } from '../gitCommands'
import { errorMessage, requestUrl, sendJson, type RouteHandler } from './routeUtils'
import { readGitBranches, readGitStatus } from './gitReaders'

function runGitRemote(res: Parameters<RouteHandler>[1], command: 'git push' | 'git pull') {
  try {
    const output = execSync(command, { encoding: 'utf-8', timeout: 15000, stdio: 'pipe' })
    sendJson(res, { success: true, message: output })
  } catch (err) {
    sendJson(res, { success: false, error: errorMessage(err, String(err)) }, statusFromError(err))
  }
}

/** Git version control + branch management + JMX semantic diff APIs. */
export const handleGitRoutes: RouteHandler = async (req, res, url) => {
  if (url === '/api/jmeter/git/status' && req.method === 'GET') {
    try {
      sendJson(res, readGitStatus())
    } catch (err) {
      sendJson(res, { branch: 'local', clean: true, files: [], ahead: 0, behind: 0, error: String(err) })
    }
    return true
  }

  if (url === '/api/jmeter/git/commit' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const message = typeof body.message === 'string' && body.message.trim() ? body.message : 'Update JMeter Test Plan'
      const output = gitCommitAll(message)
      sendJson(res, { success: true, output })
    } catch (err) {
      sendJson(res, { success: false, error: errorMessage(err, String(err)) }, statusFromError(err))
    }
    return true
  }

  if (url === '/api/jmeter/git/push' && req.method === 'POST') {
    runGitRemote(res, 'git push')
    return true
  }

  if (url === '/api/jmeter/git/pull' && req.method === 'POST') {
    runGitRemote(res, 'git pull')
    return true
  }

  // --- Git Branch Management APIs ---
  if (url === '/api/jmeter/git/branches' && req.method === 'GET') {
    try {
      sendJson(res, readGitBranches())
    } catch (err) {
      sendJson(res, { current: 'main', branches: ['main'], error: String(err) })
    }
    return true
  }

  if (url === '/api/jmeter/git/checkout' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req)
      const branch = typeof body.branch === 'string' ? body.branch : ''
      const createNew = Boolean(body.createNew)

      if (!isSafeBranchName(branch)) {
        sendJson(res, { error: 'Invalid branch name.' }, 400)
        return true
      }

      const output = gitCheckout(branch, createNew)
      sendJson(res, { success: true, branch, output })
    } catch (err) {
      sendJson(res, { success: false, error: errorMessage(err, String(err)) }, statusFromError(err))
    }
    return true
  }

  if (url.startsWith('/api/jmeter/git/diff') && req.method === 'GET') {
    try {
      const targetFile = requestUrl(req, url).searchParams.get('file') || ''
      if (targetFile && !isSafeRelativePath(targetFile)) {
        sendJson(res, { diff: '', error: 'Invalid file path.' }, 400)
        return true
      }
      let diff = ''
      try {
        diff = gitDiff(targetFile || undefined)
      } catch {
        diff = 'No diff found or untracked file.'
      }
      sendJson(res, { diff })
    } catch (err) {
      sendJson(res, { diff: '', error: String(err) })
    }
    return true
  }

  // --- JMX Semantic Diff API ---
  if (url.startsWith('/api/jmeter/jmx/diff') && req.method === 'GET') {
    try {
      const u = requestUrl(req, url)
      const branchA = u.searchParams.get('branchA') || 'main'
      const branchB = u.searchParams.get('branchB') || 'HEAD'
      const file = u.searchParams.get('file') || 'plans/test.jmx'

      sendJson(res, computeJmxDiff(branchA, branchB, file))
    } catch (err) {
      sendJson(res, { error: errorMessage(err, String(err)) }, statusFromError(err))
    }
    return true
  }

  return false
}
