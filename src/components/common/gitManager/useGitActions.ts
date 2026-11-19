import { useState } from 'react'
import { gitService } from '../../../services/gitService'
import type { GitRepo } from './useGitRepo'

export type GitActions = ReturnType<typeof useGitActions>

export function useGitActions(repo: GitRepo) {
  const { setLoading, setError, setActionMessage, loadStatus, loadBranches } = repo
  const [commitMessage, setCommitMessage] = useState('')
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [branchLoading, setBranchLoading] = useState(false)

  const handleCommit = async (pushAfter = false) => {
    if (!commitMessage.trim()) {
      setError('Please enter a commit message.')
      return
    }
    setLoading(true)
    setError(null)
    setActionMessage('Committing changes...')
    try {
      const res = await gitService.commit(commitMessage.trim())
      if (!res.success) {
        throw new Error(res.error || 'Commit failed')
      }
      setCommitMessage('')
      if (pushAfter) {
        setActionMessage('Pushing to remote...')
        const pushRes = await gitService.push()
        if (!pushRes.success) throw new Error(pushRes.error || 'Push failed')
        setActionMessage('✅ Committed and Pushed successfully!')
      } else {
        setActionMessage('✅ Committed successfully!')
      }
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handlePull = async () => {
    setLoading(true)
    setError(null)
    setActionMessage('Pulling latest changes...')
    try {
      const res = await gitService.pull()
      if (!res.success) throw new Error(res.error || 'Pull failed')
      setActionMessage('✅ Pulled latest changes successfully!')
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (branch: string, createNew = false) => {
    setBranchLoading(true)
    setError(null)
    setActionMessage(`Switching to branch ${branch}...`)
    try {
      const res = await gitService.checkout(branch, createNew)
      if (!res.success) throw new Error(res.error || 'Checkout failed')
      setActionMessage(`✅ Switched to branch: ${branch}`)
      setShowBranchDropdown(false)
      setNewBranchName('')
      await loadStatus()
      await loadBranches()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBranchLoading(false)
    }
  }

  return {
    commitMessage,
    setCommitMessage,
    showBranchDropdown,
    setShowBranchDropdown,
    newBranchName,
    setNewBranchName,
    branchLoading,
    handleCommit,
    handlePull,
    handleCheckout,
  }
}
