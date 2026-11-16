import type { BrowserRecorderModalProps } from '../../features/browserRecorder/recorderTypes'
import { useBrowserRecorder } from '../../features/browserRecorder/useBrowserRecorder'
import * as S from '../../features/browserRecorder/recorderStyles'
import * as P from '../../features/browserRecorder/panelStyles'
import { CorrelationWizardModal } from './CorrelationWizardModal'
import { RecorderHeader } from './browserRecorder/RecorderHeader'
import { ErrorBanner } from './browserRecorder/ErrorBanner'
import { LiveControls } from './browserRecorder/LiveControls'
import { HarControls } from './browserRecorder/HarControls'
import { TransactionStepper } from './browserRecorder/TransactionStepper'
import { FilterToolbar } from './browserRecorder/FilterToolbar'
import { RequestsTable } from './browserRecorder/RequestsTable'
import { RequestInspector } from './browserRecorder/RequestInspector'
import { ImportFooter } from './browserRecorder/ImportFooter'

export function BrowserRecorderModal(props: BrowserRecorderModalProps) {
  const rec = useBrowserRecorder(props)

  if (!props.isOpen) return null

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-container browser-recorder-studio" onClick={(e) => e.stopPropagation()} style={S.modalContainer}>
        <RecorderHeader rec={rec} />

        <ErrorBanner message={rec.errorNotice} onDismiss={() => rec.setErrorNotice(null)} />

        {/* Top Controls Bar (Live vs HAR) */}
        <div style={S.controlsBar}>
          {rec.activeTab === 'live' ? <LiveControls rec={rec} /> : <HarControls rec={rec} />}
          {rec.activeTab === 'live' && rec.isRecording && <TransactionStepper rec={rec} />}
        </div>

        <FilterToolbar rec={rec} />

        {/* Main Content Area (Table + Inspector Split) */}
        <div style={P.mainArea}>
          <RequestsTable rec={rec} />
          <RequestInspector rec={rec} />
        </div>

        <ImportFooter rec={rec} />
      </div>

      <CorrelationWizardModal
        isOpen={rec.isCorrelationWizardOpen}
        onClose={() => rec.setIsCorrelationWizardOpen(false)}
        candidates={rec.correlationCandidates}
        onApply={rec.handleApplyCorrelationsAndImport}
      />
    </div>
  )
}
