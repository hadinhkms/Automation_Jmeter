import { Play, Square, Trash2, Globe } from 'lucide-react'
import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import type { BrowserChoice } from '../../../features/browserRecorder/recorderTypes'
import * as S from '../../../features/browserRecorder/recorderStyles'

export function LiveControls({ rec }: { rec: RecorderModel }) {
  const { isRecording, isStarting, availableBrowsers } = rec
  return (
    <div style={S.row('10px', { flexWrap: 'wrap' })}>
      {/* Target URL Input */}
      <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <Globe size={15} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
        <input
          type="text"
          className="form-control"
          placeholder="https://your-website.com or https://api.demo.com"
          value={rec.targetUrl}
          disabled={isRecording}
          onChange={(e) => rec.setTargetUrl(e.target.value)}
          style={S.urlInput}
        />
      </div>

      {/* Browser Select */}
      <select
        value={rec.selectedBrowser}
        disabled={isRecording}
        onChange={(e) => rec.setSelectedBrowser(e.target.value as BrowserChoice)}
        style={S.browserSelect}
      >
        {availableBrowsers.chrome && <option value="chrome">Google Chrome</option>}
        {availableBrowsers.edge && <option value="edge">Microsoft Edge</option>}
        {!availableBrowsers.chrome && !availableBrowsers.edge && <option value="chrome">Chrome (Auto-detect)</option>}
      </select>

      {/* Auto Split Checkbox */}
      <label
        style={S.autoSplitLabel(isRecording)}
        title="Automatically create a new Transaction Step whenever you navigate to a new page or change SPA route"
      >
        <input
          type="checkbox"
          checked={rec.autoPageSplit}
          disabled={isRecording}
          onChange={(e) => rec.setAutoPageSplit(e.target.checked)}
        />
        <span>Auto-Split on Page Navigation</span>
      </label>

      {/* Start / Stop Button */}
      {!isRecording ? (
        <button
          type="button"
          className="btn-primary"
          onClick={rec.handleStartRecording}
          disabled={isStarting}
          style={S.startBtn(isStarting)}
        >
          <Play size={14} fill="currentColor" />
          {isStarting ? 'Launching Browser...' : 'Start Recording'}
        </button>
      ) : (
        <button type="button" onClick={rec.handleStopRecording} style={S.stopBtn}>
          <Square size={13} fill="currentColor" />
          Stop Recording
        </button>
      )}

      {/* Clear button */}
      {rec.requests.length > 0 && (
        <button
          type="button"
          className="btn-secondary"
          onClick={rec.handleClear}
          style={S.clearBtn}
          title="Clear all recorded requests"
        >
          <Trash2 size={14} />
          Clear
        </button>
      )}
    </div>
  )
}
