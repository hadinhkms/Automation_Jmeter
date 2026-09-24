// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import {
  Clipboard,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  PauseOctagon,
  Play,
  Save,
  Scissors,
  Settings2,
  Square,
  Terminal,
  Trash2,
  ExternalLink,
  FileCode2,
  FolderArchive,
  Radio,
  Sparkles,
  Activity,
  ShieldCheck,
  GitBranch,
} from 'lucide-react'
import type { AppCommands } from '../menu/MenuBar'
import { useJMeterStore } from '../../store/jmeterStore'
import { jmeterRunnerService } from '../../services/jmeterRunnerService'

function ToolButton({
  title,
  action,
  disabled,
  active,
  children,
}: {
  title: string
  action: () => void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`tool-button ${active ? 'active-tool' : ''}`}
      title={title}
      aria-label={title}
      onClick={action}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function Toolbar({
  commands,
  disabled,
  activeModal,
}: {
  commands: AppCommands
  disabled: Partial<Record<keyof AppCommands, boolean>>
  activeModal?: string | null
}) {
  const store = useJMeterStore()

  const openHtmlReport = () => {
    if (store.activeRunId) {
      window.open(jmeterRunnerService.getReportUrl(store.activeRunId), '_blank')
    }
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="JMeter actions">
      <ToolButton title="New test plan" action={commands.newPlan}><FilePlus2 size={17} /></ToolButton>
      <ToolButton title="Open JMX" action={commands.openJmx}><FolderOpen size={17} /></ToolButton>
      <ToolButton title="Save" action={commands.save} disabled={disabled.save}><Save size={17} /></ToolButton>
      <ToolButton title="Export JMX" action={commands.exportJmx}><Download size={17} /></ToolButton>
      <ToolButton
        title="Enterprise Template Gallery"
        action={commands.openTemplateGallery}
        active={activeModal === 'templates'}
      >
        <Sparkles size={17} style={{ color: activeModal === 'templates' ? '#ffffff' : '#f59e0b' }} />
      </ToolButton>
      <ToolButton
        title="Visual Workload Curve & VUs Ramp-Up"
        action={commands.openWorkloadGraph}
        active={activeModal === 'workload'}
      >
        <Activity size={17} style={{ color: activeModal === 'workload' ? '#ffffff' : '#3b82f6' }} />
      </ToolButton>
      <ToolButton
        title="SLA Quality Gates & Alerting"
        action={commands.openSlaSettings}
        active={activeModal === 'sla'}
      >
        <ShieldCheck size={17} style={{ color: activeModal === 'sla' ? '#ffffff' : '#10b981' }} />
      </ToolButton>
      <ToolButton
        title="Git Version Control & Visual Diff"
        action={commands.openGitManager}
        active={activeModal === 'git'}
      >
        <GitBranch size={17} style={{ color: activeModal === 'git' ? '#ffffff' : '#a78bfa' }} />
      </ToolButton>
      <span className="toolbar-separator" />
      <ToolButton
        title="Import from cURL… (Tools -> Import from cURL)"
        action={commands.importCurl}
        active={activeModal === 'curl'}
      >
        <FileCode2 size={17} />
      </ToolButton>
      <ToolButton
        title="Project File Manager (upload CSV, attachments, files)"
        action={commands.openAssetManager}
        active={activeModal === 'assets'}
      >
        <FolderArchive size={17} />
      </ToolButton>
      <ToolButton
        title="Browser & Network API Recorder… (Tools -> Browser Recorder)"
        action={commands.openBrowserRecorder}
        active={activeModal === 'recorder'}
      >
        <Radio size={17} style={{ color: activeModal === 'recorder' ? '#ffffff' : '#818cf8' }} />
      </ToolButton>
      <span className="toolbar-separator" />
      <ToolButton title="Cut selected node" action={commands.cut} disabled={disabled.cut}><Scissors size={17} /></ToolButton>
      <ToolButton title="Copy selected node" action={commands.copy}><Copy size={17} /></ToolButton>
      <ToolButton title="Paste into selected node" action={commands.paste} disabled={disabled.paste}><Clipboard size={17} /></ToolButton>
      <span className="toolbar-separator" />
      <ToolButton
        title={store.executionMode === 'real' ? 'Start real JMeter run (jmeter.bat -n)' : 'Start mock simulation'}
        action={commands.start}
        disabled={disabled.start}
      >
        <Play size={18} className="run-color" />
      </ToolButton>
      <ToolButton title="Stop test" action={commands.stop} disabled={disabled.stop}><Square size={17} className="stop-color" /></ToolButton>
      <ToolButton title="Shutdown test" action={commands.shutdown} disabled={disabled.shutdown}><PauseOctagon size={17} className="stop-color" /></ToolButton>
      <span className="toolbar-separator" />
      <ToolButton title="Clear results" action={commands.clear} disabled={disabled.clear}><Trash2 size={17} /></ToolButton>
      <button type="button" className="tool-text-button" title="Clear all listener results" onClick={commands.clear} disabled={disabled.clear}>
        Clear All
      </button>

      <span className="toolbar-spacer" />

      {/* Mode Badge & Action Buttons */}
      <div className="toolbar-right-actions">
        <button
          type="button"
          className={`mode-badge ${store.executionMode === 'real' ? 'mode-real' : 'mode-mock'}`}
          title="Click to configure JMeter environment and execution mode"
          onClick={() => store.setSettingsOpen(true)}
        >
          <span className="mode-dot" />
          <span>{store.executionMode === 'real' ? (store.jmeterConfig.version ? `JMeter ${store.jmeterConfig.version}` : 'Real JMeter') : 'Mock Mode'}</span>
        </button>

        {store.hasHtmlReport ? (
          <button
            type="button"
            className="tool-report-button"
            title="Open generated JMeter HTML Dashboard Report in new tab"
            onClick={openHtmlReport}
          >
            <ExternalLink size={14} />
            <span>HTML Report</span>
          </button>
        ) : null}

        <ToolButton
          title={store.isConsoleOpen ? 'Hide Console Log' : 'Show JMeter Live Console Log'}
          action={() => store.setConsoleOpen(!store.isConsoleOpen)}
          active={store.isConsoleOpen}
        >
          <Terminal size={17} />
        </ToolButton>

        <ToolButton
          title="JMeter Settings & Configuration"
          action={() => store.setSettingsOpen(true)}
        >
          <Settings2 size={17} />
        </ToolButton>
      </div>
    </div>
  )
}
