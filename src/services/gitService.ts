export interface GitFileStatus {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed'
}

export interface GitStatusResult {
  branch: string
  clean: boolean
  files: GitFileStatus[]
  ahead: number
  behind: number
  lastCommit?: {
    hash: string
    message: string
    author: string
    date: string
  }
}

export const gitService = {
  async getStatus(): Promise<GitStatusResult> {
    const res = await fetch('/api/jmeter/git/status')
    if (!res.ok) throw new Error(`Git status failed: ${res.statusText}`)
    return res.json()
  },

  async commit(message: string, files?: string[]): Promise<{ success: boolean; hash?: string; error?: string }> {
    const res = await fetch('/api/jmeter/git/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, files }),
    })
    return res.json()
  },

  async push(): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch('/api/jmeter/git/push', { method: 'POST' })
    return res.json()
  },

  async pull(): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch('/api/jmeter/git/pull', { method: 'POST' })
    return res.json()
  },

  async getDiff(filePath?: string): Promise<{ diff: string }> {
    const url = filePath ? `/api/jmeter/git/diff?file=${encodeURIComponent(filePath)}` : '/api/jmeter/git/diff'
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Git diff failed: ${res.statusText}`)
    return res.json()
  },
}
