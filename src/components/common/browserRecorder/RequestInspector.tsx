import { Key } from 'lucide-react'
import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import { INSPECTOR_TABS } from '../../../features/browserRecorder/recorderTypes'
import { inspectorTabLabel } from '../../../features/browserRecorder/recorderLogic'
import * as P from '../../../features/browserRecorder/panelStyles'
import { InspectorContent } from './InspectorContent'

/** Request Detail Inspector Column */
export function RequestInspector({ rec }: { rec: RecorderModel }) {
  const { inspectedReq, inspectedTab } = rec
  return (
    <div style={P.inspectorColumn}>
      {inspectedReq ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Inspector Header */}
          <div style={P.inspectorHeader}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={P.inspMethod}>{inspectedReq.method}</span>
                <span style={P.inspUrl} title={inspectedReq.url}>
                  {inspectedReq.url}
                </span>
              </div>

              {inspectedReq.hasSensitiveData && (
                <span style={P.sensitiveBadge}>
                  <Key size={11} /> Sensitive Data
                </span>
              )}
            </div>

            {/* Inspector Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              {INSPECTOR_TABS.map((t) => {
                if (t === 'sensitive' && !inspectedReq.hasSensitiveData) return null
                return (
                  <button key={t} type="button" onClick={() => rec.setInspectedTab(t)} style={P.inspTab(inspectedTab === t)}>
                    {inspectorTabLabel(t, inspectedReq)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Inspector Body Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            <InspectorContent
              req={inspectedReq}
              tab={inspectedTab}
              copiedKey={rec.copiedKey}
              onCopy={rec.handleCopyText}
            />
          </div>
        </div>
      ) : (
        <div style={P.noSelection}>Select a request from the table to inspect details.</div>
      )}
    </div>
  )
}
