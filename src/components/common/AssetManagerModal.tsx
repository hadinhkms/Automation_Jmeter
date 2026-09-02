import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Copy,
  File,
  FolderArchive,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { projectAssetService, type ProjectAsset } from '../../services/projectAssetService'

interface AssetManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

type AssetDir = 'data' | 'downloads' | 'attachments'

const assetDirs: Array<{ value: AssetDir; label: string }> = [
  { value: 'data', label: 'CSV / Data' },
  { value: 'attachments', label: 'Attachments' },
  { value: 'downloads', label: 'Downloads' },
]

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, unitIndex)).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(ms: number): string {
  if (!ms) return '-'
  return new Date(ms).toLocaleString()
}

export function AssetManagerModal({ isOpen, onClose }: AssetManagerModalProps) {
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [activeDir, setActiveDir] = useState<AssetDir>('data')
  const [status, setStatus] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="asset-manager-title">
      <div className="settings-modal asset-manager-modal">
        <div className="modal-header">
          <div className="modal-header-title">
            <FolderArchive size={18} />
            <h3 id="asset-manager-title">Project File Manager</h3>
          </div>
          <button type="button" className="modal-close-button" aria-label="Close assets" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body asset-manager-body">
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            onChange={(event) => {
              handleUpload(event.target.files)
              event.target.value = ''
            }}
          />

          <div className="asset-manager-tabs" role="tablist" aria-label="Asset folder">
            {assetDirs.map((dir) => (
              <button
                key={dir.value}
                type="button"
                className={activeDir === dir.value ? 'active' : ''}
                onClick={() => setActiveDir(dir.value)}
              >
                {dir.label}
                <span>{assets.filter((asset) => asset.relativePath.startsWith(`${dir.value}/`)).length}</span>
              </button>
            ))}
          </div>

          <div
            className={`asset-manager-dropzone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setIsDragOver(false)
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragOver(false)
              handleUpload(event.dataTransfer.files)
            }}
          >
            <UploadCloud size={21} />
            <span>Drop files into {activeDir}/ or choose from your computer.</span>
            <button type="button" className="text-button" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud size={14} />
              Upload
            </button>
          </div>

          {status ? (
            <div className={`asset-manager-status ${status.type}`}>
              <span>{status.text}</span>
              <button type="button" aria-label="Dismiss status" onClick={() => setStatus(null)}>
                <X size={13} />
              </button>
            </div>
          ) : null}

          <div className="asset-manager-list">
            <div className="asset-manager-list-header">
              <span>File</span>
              <span>Size</span>
              <span>Updated</span>
              <span>Actions</span>
            </div>

            {isLoading ? (
              <div className="asset-manager-empty">
                <RefreshCw size={18} className="spin-icon" />
                <span>Loading assets...</span>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="asset-manager-empty">
                <File size={20} />
                <span>No files in {activeDir}/ yet.</span>
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div key={asset.relativePath} className="asset-manager-row">
                  <div className="asset-path-cell">
                    <File size={15} />
                    <code title={asset.relativePath}>{asset.relativePath}</code>
                  </div>
                  <span>{formatBytes(asset.size)}</span>
                  <span>{formatDate(asset.updatedAt)}</span>
                  <div className="asset-actions">
                    <button
                      type="button"
                      className="icon-button"
                      title="Copy relative path"
                      onClick={() => handleCopyPath(asset.relativePath)}
                    >
                      {copiedPath === asset.relativePath ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      title="Delete asset"
                      onClick={() => handleDelete(asset)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="text-button" onClick={loadAssets} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
            Refresh
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
