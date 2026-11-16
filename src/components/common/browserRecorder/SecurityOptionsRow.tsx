import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import * as S from '../../../features/browserRecorder/recorderStyles'
import * as P from '../../../features/browserRecorder/panelStyles'

const label = (color: string) => S.row('6px', { cursor: 'pointer', color })

/** Footer row 2: Redaction & Security Settings & Preview */
export function SecurityOptionsRow({ rec }: { rec: RecorderModel }) {
  return (
    <div style={P.securityRow}>
      <div style={S.row('14px', { flexWrap: 'wrap' })}>
        <label style={label('#cbd5e1')}>
          <input type="checkbox" checked={rec.cleanHeaders} onChange={(e) => rec.setCleanHeaders(e.target.checked)} />
          <span>Clean Redundant Browser Headers</span>
        </label>

        <label style={label('#cbd5e1')}>
          <input
            type="checkbox"
            checked={rec.maskSensitive}
            disabled={rec.parameterizeSecrets}
            onChange={(e) => rec.setMaskSensitive(e.target.checked)}
          />
          <span>Mask Sensitive Values (*****)</span>
        </label>

        <label style={label('#38bdf8')}>
          <input
            type="checkbox"
            checked={rec.parameterizeSecrets}
            onChange={(e) => {
              rec.setParameterizeSecrets(e.target.checked)
              if (e.target.checked) rec.setMaskSensitive(false)
            }}
          />
          <span>Parameterize Secrets into <strong>${'{AUTH_TOKEN}'}, ${'{PASSWORD}'}</strong> + UDV</span>
        </label>
      </div>

      <div style={{ color: '#818cf8', fontWeight: 500 }}>
        Preview: {rec.estimatedSummary}
      </div>
    </div>
  )
}
