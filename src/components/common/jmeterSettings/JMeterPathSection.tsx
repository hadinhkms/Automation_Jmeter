import { CheckCircle2, XCircle, Search } from 'lucide-react'
import type { JMeterDetectionResult } from '../../../services/jmeterRunnerService'

interface JMeterPathSectionProps {
  pathInput: string
  loading: boolean
  testResult: JMeterDetectionResult | null
  onPathChange: (value: string) => void
  onDetect: () => void
  onTestPath: () => void
}

export function JMeterPathSection({
  pathInput,
  loading,
  testResult,
  onPathChange,
  onDetect,
  onTestPath,
}: JMeterPathSectionProps) {
  return (
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
          onChange={(e) => onPathChange(e.target.value)}
        />
        <button
          type="button"
          className="text-button"
          disabled={loading}
          onClick={onDetect}
          title="Auto-detect JMeter in system PATH and standard locations"
        >
          <Search size={14} />
          <span>Auto Detect</span>
        </button>
        <button
          type="button"
          className="text-button btn-test"
          disabled={loading || !pathInput.trim()}
          onClick={onTestPath}
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
  )
}
