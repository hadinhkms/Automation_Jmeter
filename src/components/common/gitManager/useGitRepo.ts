import { useEffect, useState } from 'react'
import { gitService, type GitStatusResult } from '../../../services/gitService'

export function useGitRepo(isOpen: boolean) {
  const [status, setStatus] = useState<GitStatusResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [branches, setBranches] = useState<string[]>([])

  const loadStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await gitService.getStatus()
      setStatus(res)
      if (res.files.length > 0 && !selectedFile) {
        setSelectedFile(res.files[0].path)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      const res = await gitService.getBranches()
      setBranches(res.branches)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadStatus()
      loadBranches()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return {
    status,
    loading,
    setLoading,
    error,
    setError,
    actionMessage,
    setActionMessage,
    selectedFile,
    setSelectedFile,
    branches,
    loadStatus,
    loadBranches,
  }
}

export type GitRepo = ReturnType<typeof useGitRepo>
