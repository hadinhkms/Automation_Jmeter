import { ExternalLink, Settings2, Terminal } from 'lucide-react'
import { useJMeterStore } from '../../../store/jmeterStore'
import { jmeterRunnerService } from '../../../services/jmeterRunnerService'
import { ToolButton } from './ToolButton'

type StoreState = ReturnType<typeof useJMeterStore.getState>

/** Mode badge, HTML report link, console toggle and settings button. */
export function ToolbarRightActions({ store }: { store: StoreState }) {
  const openHtmlReport = () => {
    if (store.activeRunId) {
      window.open(jmeterRunnerService.getReportUrl(store.activeRunId), '_blank')
    }
  }

  return (
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
  )
}
