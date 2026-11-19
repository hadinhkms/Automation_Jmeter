import { Save, X, Terminal } from 'lucide-react'
import { useJMeterSettings } from './jmeterSettings/useJMeterSettings'
import { ExecutionModeSection } from './jmeterSettings/ExecutionModeSection'
import { JMeterPathSection } from './jmeterSettings/JMeterPathSection'
import { RemoteWorkersSection } from './jmeterSettings/RemoteWorkersSection'

export function JMeterSettingsModal({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void } = {}) {
  const {
    store,
    pathInput,
    setPathInput,
    loading,
    testResult,
    mode,
    setMode,
    isModalOpen,
    handleClose,
    handleDetect,
    handleTestPath,
    handleSave,
  } = useJMeterSettings(isOpen, onClose)

  if (!isModalOpen) return null

  return (
    <div className="modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <Terminal size={18} />
            <h3 id="settings-dialog-title">JMeter Runner Configuration</h3>
          </div>
          <button
            type="button"
            className="modal-close-button"
            aria-label="Close settings"
            onClick={handleClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Execution Mode */}
          <ExecutionModeSection mode={mode} onChange={setMode} />

          {/* JMeter Path Configuration */}
          <JMeterPathSection
            pathInput={pathInput}
            loading={loading}
            testResult={testResult}
            onPathChange={setPathInput}
            onDetect={handleDetect}
            onTestPath={handleTestPath}
          />

          {/* Distributed Remote Workers Section */}
          <RemoteWorkersSection
            remoteHosts={String(store.testPlan.properties.remoteHosts ?? '')}
            onChange={(value) => store.updateNodeProperties(store.testPlan.id, { remoteHosts: value })}
          />
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="text-button"
            onClick={() => store.setSettingsOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleSave}
          >
            <Save size={14} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}
