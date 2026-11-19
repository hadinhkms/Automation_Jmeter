import { Cpu, HardDrive } from 'lucide-react'

type ExecutionMode = 'real' | 'mock'

export function ExecutionModeSection({ mode, onChange }: { mode: ExecutionMode; onChange: (mode: ExecutionMode) => void }) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">Execution Mode</div>
      <div className="mode-options-grid">
        <label className={`mode-option-card ${mode === 'real' ? 'active' : ''}`}>
          <input
            type="radio"
            name="executionMode"
            value="real"
            checked={mode === 'real'}
            onChange={() => onChange('real')}
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
            onChange={() => onChange('mock')}
          />
          <HardDrive size={20} className="mode-icon" />
          <div className="mode-details">
            <strong>Mock Simulation Mode</strong>
            <span>Simulates virtual traffic and response metrics directly in the browser without requiring Java or JMeter installed.</span>
          </div>
        </label>
      </div>
    </div>
  )
}
