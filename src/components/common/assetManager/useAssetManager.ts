import { useCallback, useEffect, useMemo, useState } from 'react'
import { projectAssetService, type ProjectAsset } from '../../../services/projectAssetService'
import type { AssetDir } from './assetHelpers'

/** Asset list loading, filtering, upload/delete/copy handlers for AssetManagerModal. */
export function useAssetManager(isOpen: boolean) {
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [activeDir, setActiveDir] = useState<AssetDir>('data')
  const [status, setStatus] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  const loadAssets = useCallback(async () => {
    setIsLoading(true)
    try {
      setAssets(await projectAssetService.listAssets())
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not load project assets.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadAssets()
    }
  }, [isOpen, loadAssets])

  const filteredAssets = useMemo(() => {
    return assets
      .filter((asset) => asset.relativePath.startsWith(`${activeDir}/`))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [assets, activeDir])

  const handleUpload = async (files: FileList | null) => {
    const fileList = Array.from(files || [])
    if (fileList.length === 0) return

    setStatus({ type: 'info', text: `Uploading ${fileList.length} file(s)...` })
    try {
      for (const file of fileList) {
        await projectAssetService.uploadAsset(file, activeDir)
      }
      setStatus({ type: 'success', text: `Uploaded ${fileList.length} file(s) to ${activeDir}/.` })
      await loadAssets()
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Upload failed.',
      })
    }
  }

  const handleDelete = async (asset: ProjectAsset) => {
    if (!window.confirm(`Delete ${asset.relativePath}?`)) return

    try {
      await projectAssetService.deleteAsset(asset.relativePath)
      setStatus({ type: 'success', text: `Deleted ${asset.relativePath}.` })
      await loadAssets()
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Delete failed.',
      })
    }
  }

  const handleCopyPath = async (relativePath: string) => {
    try {
      await navigator.clipboard.writeText(relativePath)
      setCopiedPath(relativePath)
      setTimeout(() => setCopiedPath(null), 1600)
    } catch {
      setStatus({ type: 'error', text: 'Could not copy path to clipboard.' })
    }
  }

  return {
    assets,
    activeDir,
    setActiveDir,
    status,
    setStatus,
    isLoading,
    copiedPath,
    filteredAssets,
    loadAssets,
    handleUpload,
    handleDelete,
    handleCopyPath,
  }
}
