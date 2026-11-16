import { Radio, X, UploadCloud, Compass } from 'lucide-react'
import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import * as S from '../../../features/browserRecorder/recorderStyles'

export function RecorderHeader({ rec }: { rec: RecorderModel }) {
  const { isRecording, activeTab, setActiveTab } = rec
  return (
    <div className="modal-header" style={S.header}>
      <div style={S.row('12px')}>
        <div style={S.iconBox(isRecording)}>
          <Radio size={18} className={isRecording ? 'recorder-pulse' : ''} />
        </div>
        <div>
          <div style={S.row('8px')}>
            <h3 style={S.title}>Browser & Network API Recorder</h3>
            {isRecording ? (
              <span style={S.liveBadge}>
                <span style={S.liveDot} />
                LIVE RECORDING
              </span>
            ) : (
              <span style={S.idleBadge}>CDP Sniffer & HAR Parser</span>
            )}
          </div>
          <p style={S.subtitle}>
            Capture live browser API traffic or import DevTools HAR to generate JMeter Samplers & Controllers.
          </p>
        </div>
      </div>

      {/* Mode Switch Tabs & Close */}
      <div style={S.row('12px')}>
        <div style={S.tabGroup}>
          <button
            type="button"
            className={`recorder-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
            style={S.modeTab(activeTab === 'live')}
          >
            <Compass size={14} />
            Live Browser (CDP)
          </button>
          <button
            type="button"
            className={`recorder-tab-btn ${activeTab === 'har' ? 'active' : ''}`}
            onClick={() => setActiveTab('har')}
            style={S.modeTab(activeTab === 'har')}
          >
            <UploadCloud size={14} />
            Import HAR File
          </button>
        </div>

        <button
          type="button"
          className="modal-close-btn"
          onClick={rec.onClose}
          aria-label="Close recorder"
          style={S.closeBtn}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
