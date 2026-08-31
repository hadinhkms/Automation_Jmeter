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

function ToolButton({
  title,
  action,
  disabled,
  children,
}: {
  title: string
  action: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button type="button" className="tool-button" title={title} aria-label={title} onClick={action} disabled={disabled}>
      {children}
    </button>
  )
}

export function Toolbar({ commands, disabled }: { commands: AppCommands; disabled: Partial<Record<keyof AppCommands, boolean>> }) {
  return (
    <div className="toolbar" role="toolbar" aria-label="JMeter actions">
      <ToolButton title="New test plan" action={commands.newPlan}><FilePlus2 size={17} /></ToolButton>
      <ToolButton title="Open JMX" action={commands.openJmx}><FolderOpen size={17} /></ToolButton>
      <ToolButton title="Save" action={commands.save} disabled={disabled.save}><Save size={17} /></ToolButton>
      <ToolButton title="Export JMX" action={commands.exportJmx}><Download size={17} /></ToolButton>
      <span className="toolbar-separator" />
      <ToolButton title="Cut selected node" action={commands.cut} disabled={disabled.cut}><Scissors size={17} /></ToolButton>
      <ToolButton title="Copy selected node" action={commands.copy}><Copy size={17} /></ToolButton>
      <ToolButton title="Paste into selected node" action={commands.paste} disabled={disabled.paste}><Clipboard size={17} /></ToolButton>
      <span className="toolbar-separator" />
      <ToolButton title="Start mock test" action={commands.start} disabled={disabled.start}><Play size={18} className="run-color" /></ToolButton>
      <ToolButton title="Stop mock test" action={commands.stop} disabled={disabled.stop}><Square size={17} className="stop-color" /></ToolButton>
      <ToolButton title="Shutdown mock test" action={commands.shutdown} disabled={disabled.shutdown}><PauseOctagon size={17} className="stop-color" /></ToolButton>
      <span className="toolbar-separator" />
      <ToolButton title="Clear results" action={commands.clear} disabled={disabled.clear}><Trash2 size={17} /></ToolButton>
      <button type="button" className="tool-text-button" title="Clear all listener results" onClick={commands.clear} disabled={disabled.clear}>
        Clear All
      </button>
    </div>
  )
}
