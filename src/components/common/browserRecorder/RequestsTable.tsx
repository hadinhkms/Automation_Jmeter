import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import { areAllSelected } from '../../../features/browserRecorder/recorderLogic'
import * as P from '../../../features/browserRecorder/panelStyles'
import { EmptyRequests } from './EmptyRequests'
import { RequestRow } from './RequestRow'

/** Requests Table Column */
export function RequestsTable({ rec }: { rec: RecorderModel }) {
  const { filteredRequests, selectedReqIds, inspectedReq } = rec
  return (
    <div style={P.tableColumn}>
      {filteredRequests.length === 0 ? (
        <EmptyRequests activeTab={rec.activeTab} isRecording={rec.isRecording} />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="recorder-table" style={P.table}>
            <thead style={P.thead}>
              <tr>
                <th style={P.th('32px', 'center')}>
                  <input
                    type="checkbox"
                    checked={filteredRequests.length > 0 && areAllSelected(filteredRequests, selectedReqIds)}
                    onChange={rec.handleToggleSelectAll}
                  />
                </th>
                <th style={P.th('60px', 'left')}>Method</th>
                <th style={P.th('55px', 'left')}>Status</th>
                <th style={P.th(undefined, 'left')}>Path / URL</th>
                <th style={P.th('120px', 'left')}>Transaction</th>
                <th style={P.th('65px', 'right')}>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req, idx) => (
                <RequestRow
                  key={req.id}
                  req={req}
                  idx={idx}
                  isSelected={selectedReqIds.has(req.id)}
                  isInspected={inspectedReq?.id === req.id}
                  onInspect={rec.setInspectedReqId}
                  onToggle={rec.handleToggleRequest}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
