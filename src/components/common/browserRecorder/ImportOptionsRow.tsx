import { Layers } from 'lucide-react'
import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import * as S from '../../../features/browserRecorder/recorderStyles'
import * as P from '../../../features/browserRecorder/panelStyles'

const checkLabel = S.row('6px', { fontSize: '0.78rem', cursor: 'pointer', color: '#cbd5e1' })

/** Footer row 1 (left side): target container select + structure checkboxes. */
export function ImportOptionsRow({ rec }: { rec: RecorderModel }) {
  return (
    <div style={S.row('12px', { flexWrap: 'wrap' })}>
      {/* Target Container Select */}
      <div style={S.row('6px')}>
        <Layers size={14} style={{ color: 'var(--accent, #6366f1)' }} />
        <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 500 }}>Target:</span>
        <select
          value={rec.targetContainerId}
          onChange={(e) => rec.setTargetContainerId(e.target.value)}
          style={P.targetSelect}
        >
          {rec.containers.map((c) => (
            <option key={c.id} value={c.id}>
              {' '.repeat(c.depth * 2)}{c.name} ({c.type})
            </option>
          ))}
        </select>
      </div>

      {/* Checkboxes */}
      <label style={checkLabel}>
        <input type="checkbox" checked={rec.groupByTx} onChange={(e) => rec.setGroupByTx(e.target.checked)} />
        <span>Group in <strong>Transaction Controllers</strong></span>
      </label>

      <label style={checkLabel}>
        <input
          type="checkbox"
          checked={rec.createHeaderMgr}
          onChange={(e) => rec.setCreateHeaderMgr(e.target.checked)}
        />
        <span>Create <strong>HTTP Header Manager</strong></span>
      </label>

      <label style={checkLabel}>
        <input
          type="checkbox"
          checked={rec.createCookieMgr}
          onChange={(e) => rec.setCreateCookieMgr(e.target.checked)}
        />
        <span>Create <strong>HTTP Cookie Manager</strong></span>
      </label>

      <label style={checkLabel}>
        <input
          type="checkbox"
          checked={rec.createDefaults}
          onChange={(e) => rec.setCreateDefaults(e.target.checked)}
        />
        <span>Extract <strong>HTTP Defaults</strong></span>
      </label>
    </div>
  )
}
