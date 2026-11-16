import { CheckSquare, Square as SquareEmpty, FolderTree, Edit3 } from 'lucide-react'
import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import { areAllSelected } from '../../../features/browserRecorder/recorderLogic'
import * as S from '../../../features/browserRecorder/recorderStyles'

export function SelectionToolbar({ rec }: { rec: RecorderModel }) {
  const { selectedCount, filteredRequests } = rec
  const allSelected = areAllSelected(filteredRequests, rec.selectedReqIds) && filteredRequests.length > 0
  return (
    <div style={S.row('8px', { flexWrap: 'wrap' })}>
      {/* Auto Group by Route Button */}
      <button
        type="button"
        className="btn-secondary"
        onClick={rec.handleAutoGroupByRoute}
        disabled={rec.requests.length === 0}
        title="Automatically group all recorded requests into Transactions by their URL pathname route"
        style={S.autoGroupBtn}
      >
        <FolderTree size={12} />
        Auto-Group by Page/Route
      </button>

      {/* Batch Reassign Step Name */}
      {selectedCount > 0 && (
        <div style={S.row('4px')}>
          <input
            type="text"
            placeholder="Set Step Name..."
            value={rec.batchStepInput}
            onChange={(e) => rec.setBatchStepInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') rec.handleApplyBatchStep()
            }}
            style={S.batchInput}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={rec.handleApplyBatchStep}
            disabled={!rec.batchStepInput.trim()}
            style={S.tinyBtn('3px')}
          >
            <Edit3 size={11} />
            Assign ({selectedCount})
          </button>
        </div>
      )}

      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
        <strong>{selectedCount}</strong>/{filteredRequests.length} selected
      </span>

      <button type="button" className="btn-secondary" onClick={rec.handleToggleSelectAll} style={S.tinyBtn('4px')}>
        {allSelected ? (
          <>
            <SquareEmpty size={12} />
            Deselect All
          </>
        ) : (
          <>
            <CheckSquare size={12} />
            Select All
          </>
        )}
      </button>
    </div>
  )
}
