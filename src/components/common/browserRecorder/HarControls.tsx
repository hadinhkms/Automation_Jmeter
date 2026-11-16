import { useRef } from 'react'
import { Trash2, UploadCloud } from 'lucide-react'
import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import * as S from '../../../features/browserRecorder/recorderStyles'

/** HAR Import Banner */
export function HarControls({ rec }: { rec: RecorderModel }) {
  const harFileInputRef = useRef<HTMLInputElement>(null)
  return (
    <div style={S.row('12px', { justifyContent: 'space-between' })}>
      <div style={S.row('10px')}>
        <input
          ref={harFileInputRef}
          type="file"
          accept=".har,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) rec.handleHarFile(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className="btn-primary"
          onClick={() => harFileInputRef.current?.click()}
          style={S.harPickBtn}
        >
          <UploadCloud size={15} />
          Choose .HAR File...
        </button>
        {rec.harFileName ? (
          <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 500, fontFamily: 'monospace' }}>
            {rec.harFileName} ({rec.requests.length} requests parsed)
          </span>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
            Export .har from DevTools (F12 -&gt; Network -&gt; Export HAR) and load here.
          </span>
        )}
      </div>

      {rec.requests.length > 0 && (
        <button type="button" className="btn-secondary" onClick={rec.handleClear} style={S.clearBtn}>
          <Trash2 size={14} />
          Clear HAR
        </button>
      )}
    </div>
  )
}
