import { FolderPlus, ChevronRight } from 'lucide-react'
import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import * as S from '../../../features/browserRecorder/recorderStyles'

/** Active Transaction Stepper Bar (shown while live recording is active). */
export function TransactionStepper({ rec }: { rec: RecorderModel }) {
  return (
    <div style={S.stepperBar}>
      <div style={S.row('6px', { fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 })}>
        <FolderPlus size={15} />
        <span>Active Step:</span>
      </div>
      <span style={S.stepChip}>{rec.currentTransaction}</span>

      <span style={{ color: '#475569' }}>|</span>

      <div style={S.row('6px', { flex: 1 })}>
        <input
          type="text"
          placeholder="Next step name (e.g. 02_Search_Product, 03_Checkout)..."
          value={rec.nextTransactionInput}
          onChange={(e) => rec.setNextTransactionInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') rec.handleAddTransactionStep()
          }}
          style={S.stepInput}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={rec.handleAddTransactionStep}
          disabled={!rec.nextTransactionInput.trim()}
          style={S.stepBtn}
        >
          <ChevronRight size={13} />
          Switch Step
        </button>
      </div>
    </div>
  )
}
