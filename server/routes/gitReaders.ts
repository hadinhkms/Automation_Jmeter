import { execSync } from 'node:child_process'

type GitFileStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed'

/** Current branch + porcelain working-tree status (fixed commands, no user input). */
export function readGitStatus() {
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
    let status: GitFileStatus = 'modified'
    if (code === '??') status = 'untracked'
    else if (code === 'A') status = 'added'
    else if (code === 'D') status = 'deleted'
    else if (code === 'R') status = 'renamed'
    return { path, status }
  })

  return { branch, clean: files.length === 0, files, ahead: 0, behind: 0 }
}

/** Current branch + de-duplicated local/remote branch names. */
export function readGitBranches() {
  let currentBranch = 'main'
  try {
    currentBranch = execSync('git branch --show-current', { encoding: 'utf-8', stdio: 'pipe' }).trim() || 'main'
  } catch {
    currentBranch = 'main'
  }

  let branches: string[] = []
  try {
    const raw = execSync('git branch -a --no-color', { encoding: 'utf-8', stdio: 'pipe' })
    branches = raw
      .split('\n')
      .map((line) => line.replace(/^[\s*]+/, '').trim())
      .filter((b) => b && !b.includes('HEAD') && !b.includes('->'))
      .map((b) => b.replace(/^remotes\/origin\//, ''))
      .filter((b, i, arr) => arr.indexOf(b) === i)
  } catch {
    branches = [currentBranch]
  }

  return { current: currentBranch, branches }
}
