import { Sparkles, Link2 } from 'lucide-react'
import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import * as S from '../../../features/browserRecorder/recorderStyles'
import * as P from '../../../features/browserRecorder/panelStyles'
import { ImportOptionsRow } from './ImportOptionsRow'
import { SecurityOptionsRow } from './SecurityOptionsRow'

/** Modal Footer / Import Config */
export function ImportFooter({ rec }: { rec: RecorderModel }) {
  const { selectedCount } = rec
  const enabled = selectedCount > 0
  return (
    <div style={P.footer}>
      {/* Options Row 1: Target Container & Structure */}
      <div style={S.row('16px', { justifyContent: 'space-between', flexWrap: 'wrap' })}>
        <ImportOptionsRow rec={rec} />

        {/* Action Buttons */}
        <div style={S.row('10px')}>
          <button
            type="button"
            className="btn-secondary"
            onClick={rec.onClose}
            style={{ height: '32px', padding: '0 14px', fontSize: '0.82rem' }}
          >
            Close
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={rec.handleOpenCorrelationWizard}
            disabled={selectedCount === 0}
            title="Detect dynamic tokens and extract them automatically with JSON / Regex Extractors"
            style={P.correlateBtn(enabled)}
          >
            <Link2 size={14} />
            <span>Smart Correlate ({selectedCount})</span>
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={rec.handleImportToTestPlan}
            disabled={selectedCount === 0}
            style={P.importBtn(enabled)}
          >
            <Sparkles size={14} />
            Import {selectedCount} Sampler{selectedCount !== 1 ? 's' : ''} into Test Plan
          </button>
        </div>
      </div>

      <SecurityOptionsRow rec={rec} />
    </div>
  )
}
