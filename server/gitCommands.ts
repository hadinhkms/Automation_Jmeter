import { execFileSync } from 'node:child_process'
import { isAbsolute, normalize, relative, resolve } from 'node:path'

/**
 * Git helpers that never go through a shell: arguments are passed as an argv array,
 * so user input (commit message, file path, branch name) cannot inject commands.
 */
function runGit(args: string[], timeout = 15000): string {
  return execFileSync('git', args, { encoding: 'utf-8', stdio: 'pipe', timeout, windowsHide: true })
}

/** Branch names: word chars, '-', '.', '/'; must not start with '-' (option injection) or contain '..'. */
export function isSafeBranchName(branch: unknown): branch is string {
  if (typeof branch !== 'string' || !branch || branch.length > 200) return false
  if (!/^[\w][\w\-./]*$/.test(branch)) return false
  return !branch.includes('..') && !branch.endsWith('/') && !branch.endsWith('.lock') && !branch.includes('//')
}

/** A repo-relative path that stays inside `root` (no absolute path, no `..` escape). */
export function isSafeRelativePath(filePath: unknown, root = process.cwd()): filePath is string {
  if (typeof filePath !== 'string' || !filePath.trim() || filePath.includes('\0')) return false
  if (isAbsolute(filePath) || filePath.startsWith('-')) return false
  const rel = relative(root, resolve(root, normalize(filePath)))
  return !!rel && !rel.startsWith('..') && !isAbsolute(rel)
}

export function gitDiff(file?: string): string {
  return runGit(file ? ['diff', 'HEAD', '--', file] : ['diff', 'HEAD'])
}

export function gitCommitAll(message: string): string {
  runGit(['add', '.'])
  return runGit(['commit', '-m', message])
}

export function gitCheckout(branch: string, createNew: boolean): string {
  return runGit(createNew ? ['checkout', '-b', branch] : ['checkout', branch], 10000)
}
