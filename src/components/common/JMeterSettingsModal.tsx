// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Search, Save, X, Terminal, Cpu, HardDrive } from 'lucide-react'
import { jmeterRunnerService, type JMeterDetectionResult } from '../../services/jmeterRunnerService'
import { useJMeterStore } from '../../store/jmeterStore'

export function JMeterSettingsModal({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void } = {}) {
  const store = useJMeterStore()
  const [pathInput, setPathInput] = useState(store.jmeterConfig.path || '')
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<JMeterDetectionResult | null>(null)
  const [mode, setMode] = useState<'real' | 'mock'>(store.executionMode)

  const isModalOpen = isOpen !== undefined ? isOpen : store.isSettingsOpen

  const handleClose = () => {
    if (onClose) onClose()
    store.setSettingsOpen(false)
  }

  useEffect(() => {
    setPathInput(store.jmeterConfig.path || '')
    setMode(store.executionMode)
    if (!store.jmeterConfig.version) {
      handleDetect()
    } else {
      setTestResult({
        found: store.jmeterConfig.found,
        path: store.jmeterConfig.path,
        version: store.jmeterConfig.version,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDetect = async () => {
    setLoading(true)
    try {
      const res = await jmeterRunnerService.detectJMeter()
      setTestResult(res)
      if (res.found && res.path) {
        setPathInput(res.path)
        store.setJMeterConfig({ path: res.path, found: res.found, version: res.version })
      }
    } catch {
      setTestResult({
        found: false,
        path: null,
        version: null,
        error: 'Failed to detect JMeter installation.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestPath = async () => {
    setLoading(true)
    try {
      const res = await jmeterRunnerService.saveConfig(pathInput.trim())
      setTestResult(res.detection)
      store.setJMeterConfig({
        path: res.detection.path || pathInput.trim(),
        found: res.detection.found,
        version: res.detection.version,
      })
    } catch (err) {
      setTestResult({
        found: false,
        path: null,
        version: null,
        error: err instanceof Error ? err.message : 'Failed to test path.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    await handleTestPath()
    store.setExecutionMode(mode)
    handleClose()
  }

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
          <div className="settings-section">
            <div className="settings-section-title">Execution Mode</div>
            <div className="mode-options-grid">
              <label className={`mode-option-card ${mode === 'real' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="executionMode"
                  value="real"
                  checked={mode === 'real'}
                  onChange={() => setMode('real')}
                />
                <Cpu size={20} className="mode-icon" />
                <div className="mode-details">
                  <strong>Local JMeter CLI (Non-GUI)</strong>
                  <span>Runs actual <code>jmeter.bat -n</code> process locally. Full performance engine, real metrics & HTML report.</span>
                </div>
              </label>

              <label className={`mode-option-card ${mode === 'mock' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="executionMode"
                  value="mock"
                  checked={mode === 'mock'}
                  onChange={() => setMode('mock')}
                />
                <HardDrive size={20} className="mode-icon" />
                <div className="mode-details">
                  <strong>Mock Simulation Mode</strong>
                  <span>Simulates virtual traffic and response metrics directly in the browser without requiring Java or JMeter installed.</span>
                </div>
              </label>
            </div>
          </div>

          {/* JMeter Path Configuration */}
          <div className="settings-section">
            <div className="settings-section-title">JMeter Installation Path</div>
            <p className="settings-help">
              Specify the path to your JMeter <code>bin/</code> folder or <code>jmeter.bat</code> executable.
            </p>
            <div className="path-input-group">
              <input
                type="text"
                className="path-input"
                placeholder="e.g. C:\apache-jmeter-5.6.3\bin\jmeter.bat"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
              />
              <button
                type="button"
                className="text-button"
                disabled={loading}
                onClick={handleDetect}
                title="Auto-detect JMeter in system PATH and standard locations"
              >
                <Search size={14} />
                <span>Auto Detect</span>
              </button>
              <button
                type="button"
                className="text-button btn-test"
                disabled={loading || !pathInput.trim()}
                onClick={handleTestPath}
                title="Test if JMeter executable works"
              >
                <span>{loading ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>

            {/* Detection Result Badge */}
            {testResult ? (
              <div className={`detection-status-card ${testResult.found ? 'status-success' : 'status-warning'}`}>
                {testResult.found ? (
                  <>
                    <CheckCircle2 size={18} className="status-icon success" />
                    <div>
                      <strong>JMeter Detected: {testResult.version || 'Version OK'}</strong>
                      <div className="status-path">{testResult.path}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="status-icon warning" />
                    <div>
                      <strong>JMeter Not Found</strong>
                      <div className="status-path">{testResult.error || 'Please check the directory path.'}</div>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Distributed Remote Workers Section */}
          <div className="settings-section">
            <div className="settings-section-title">Distributed Remote Load Workers (-R remote_hosts)</div>
            <p className="settings-help">
              Distribute load generation across multiple remote JMeter worker server nodes.
            </p>
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                className="path-input"
                placeholder="e.g. 192.168.1.101:1099, 192.168.1.102:1099, worker.k8s.lan"
                value={String(store.testPlan.properties.remoteHosts ?? '')}
                onChange={(e) => store.updateNodeProperties(store.testPlan.id, { remoteHosts: e.target.value })}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>
                When populated, test execution will automatically append <code>-R &lt;hosts&gt;</code> to distribute threads across workers.
              </div>
            </div>
          </div>
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
