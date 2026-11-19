import { FolderArchive, RefreshCw, X } from 'lucide-react'
import { assetDirs } from './assetManager/assetHelpers'
import { useAssetManager } from './assetManager/useAssetManager'
import { AssetDropzone } from './assetManager/AssetDropzone'
import { AssetList } from './assetManager/AssetList'

interface AssetManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AssetManagerModal({ isOpen, onClose }: AssetManagerModalProps) {
  const {
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
  } = useAssetManager(isOpen)

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

          <AssetDropzone activeDir={activeDir} onUpload={handleUpload} />

          {status ? (
            <div className={`asset-manager-status ${status.type}`}>
              <span>{status.text}</span>
              <button type="button" aria-label="Dismiss status" onClick={() => setStatus(null)}>
                <X size={13} />
              </button>
            </div>
          ) : null}

          <AssetList
            isLoading={isLoading}
            activeDir={activeDir}
            filteredAssets={filteredAssets}
            copiedPath={copiedPath}
            onCopyPath={handleCopyPath}
            onDelete={handleDelete}
          />
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
