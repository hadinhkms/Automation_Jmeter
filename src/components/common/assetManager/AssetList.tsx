import { Check, Copy, File, RefreshCw, Trash2 } from 'lucide-react'
import type { ProjectAsset } from '../../../services/projectAssetService'
import { formatBytes, formatDate } from './assetHelpers'

interface AssetListProps {
  isLoading: boolean
  activeDir: string
  filteredAssets: ProjectAsset[]
  copiedPath: string | null
  onCopyPath: (relativePath: string) => void
  onDelete: (asset: ProjectAsset) => void
}

export function AssetList({ isLoading, activeDir, filteredAssets, copiedPath, onCopyPath, onDelete }: AssetListProps) {
  return (
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
                onClick={() => onCopyPath(asset.relativePath)}
              >
                {copiedPath === asset.relativePath ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                className="icon-button danger"
                title="Delete asset"
                onClick={() => onDelete(asset)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
