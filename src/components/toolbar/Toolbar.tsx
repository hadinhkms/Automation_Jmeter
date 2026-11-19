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
  Square,
  Trash2,
} from 'lucide-react'
import type { AppCommands } from '../menu/MenuBar'
import { useJMeterStore } from '../../store/jmeterStore'
import { EnvironmentSwitcher } from './EnvironmentSwitcher'
import { ToolButton } from './toolbarParts/ToolButton'
import { ToolbarFeatureButtons, ToolbarImportButtons } from './toolbarParts/ToolbarModalButtons'
import { ToolbarRightActions } from './toolbarParts/ToolbarRightActions'

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

  return (
    <div className="toolbar" role="toolbar" aria-label="JMeter actions">
      <ToolButton title="New test plan" action={commands.newPlan}><FilePlus2 size={17} /></ToolButton>
      <ToolButton title="Open JMX" action={commands.openJmx}><FolderOpen size={17} /></ToolButton>
      <ToolButton title="Save" action={commands.save} disabled={disabled.save}><Save size={17} /></ToolButton>
      <ToolButton title="Export JMX" action={commands.exportJmx}><Download size={17} /></ToolButton>
      <ToolbarFeatureButtons commands={commands} activeModal={activeModal} />
      <span className="toolbar-separator" />
      <ToolbarImportButtons commands={commands} activeModal={activeModal} />
      <span className="toolbar-separator" />
      <ToolButton title="Cut selected node" action={commands.cut} disabled={disabled.cut}><Scissors size={17} /></ToolButton>
      <ToolButton title="Copy selected node" action={commands.copy}><Copy size={17} /></ToolButton>
      <ToolButton title="Paste into selected node" action={commands.paste} disabled={disabled.paste}><Clipboard size={17} /></ToolButton>
      <span className="toolbar-separator" />
      <EnvironmentSwitcher />
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
      <ToolbarRightActions store={store} />
    </div>
  )
}
