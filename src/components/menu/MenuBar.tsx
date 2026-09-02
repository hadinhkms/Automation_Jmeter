import { useEffect, useRef, useState } from 'react'
import { FileCode } from 'lucide-react'

export interface AppCommands {
  newPlan: () => void
  openJmx: () => void
  save: () => void
  saveAs: () => void
  exportJmx: () => void
  cut: () => void
  copy: () => void
  paste: () => void
  duplicate: () => void
  remove: () => void
  start: () => void
  stop: () => void
  shutdown: () => void
  clear: () => void
  toggleConsole: () => void
  openSettings: () => void
  openHtmlReport: () => void
  importCurl: () => void
  openBrowserRecorder: () => void
  openPluginsManager: () => void
  openAssetManager: () => void
  openTemplateGallery: () => void
  openWorkloadGraph: () => void
  openSlaSettings: () => void
  openGitManager: () => void
  openUserGuide: () => void
}

interface MenuItem {
  label?: string
  shortcut?: string
  action?: keyof AppCommands
  disabled?: boolean
  separator?: boolean
}

const menuItems: Record<string, MenuItem[]> = {
  File: [
    { label: 'New', shortcut: 'Ctrl+N', action: 'newPlan' },
    { label: 'Open JMX…', shortcut: 'Ctrl+O', action: 'openJmx' },
    { label: 'Template Gallery…', action: 'openTemplateGallery' },
    { separator: true },
    { label: 'Save', shortcut: 'Ctrl+S', action: 'save' },
    { label: 'Save As…', shortcut: 'Ctrl+Shift+S', action: 'saveAs' },
    { label: 'Export JMX…', action: 'exportJmx' },
    { separator: true },
    { label: 'Git Manager & Diff…', action: 'openGitManager' },
  ],
  Edit: [
    { label: 'Undo', shortcut: 'Ctrl+Z', disabled: true },
    { label: 'Redo', shortcut: 'Ctrl+Y', disabled: true },
    { separator: true },
    { label: 'Cut', shortcut: 'Ctrl+X', action: 'cut' },
    { label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
    { label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
    { label: 'Duplicate', shortcut: 'Ctrl+D', action: 'duplicate' },
    { label: 'Delete', shortcut: 'Delete', action: 'remove' },
  ],
  Search: [{ label: 'Search Tree…', shortcut: 'Ctrl+F', disabled: true }],
  Run: [
    { label: 'Start', shortcut: 'Ctrl+R', action: 'start' },
    { label: 'Stop', action: 'stop' },
    { label: 'Shutdown', action: 'shutdown' },
    { separator: true },
    { label: 'View Workload Curve…', action: 'openWorkloadGraph' },
    { label: 'SLA Quality Gates…', action: 'openSlaSettings' },
    { separator: true },
    { label: 'Clear Results', action: 'clear' },
    { separator: true },
    { label: 'Toggle Live Console', action: 'toggleConsole' },
    { label: 'Open HTML Report', action: 'openHtmlReport' },
  ],
  Options: [
    { label: 'Plugins Manager…', action: 'openPluginsManager' },
    { label: 'SLA Quality Gates…', action: 'openSlaSettings' },
    { label: 'Git Version Control…', action: 'openGitManager' },
    { separator: true },
    { label: 'JMeter Runner Settings…', action: 'openSettings' },
    { separator: true },
    { label: 'Look and Feel', disabled: true },
  ],
  Tools: [
    { label: 'Enterprise Template Gallery…', action: 'openTemplateGallery' },
    { label: 'Workload Curve Graph…', action: 'openWorkloadGraph' },
    { label: 'Browser & Network Recorder…', shortcut: 'Ctrl+Shift+R', action: 'openBrowserRecorder' },
    { label: 'Import from cURL…', action: 'importCurl' },
    { label: 'Project File Manager...', action: 'openAssetManager' },
    { label: 'Plugins Manager…', action: 'openPluginsManager' },
    { label: 'Git Manager & Diff…', action: 'openGitManager' },
    { separator: true },
    { label: 'Function Helper Dialog', shortcut: 'Ctrl+Shift+F1', disabled: true },
    { label: 'Generate HTML report', action: 'openHtmlReport' },
    { label: 'Export transactions for report', disabled: true },
    { label: 'Compile JSR223 Test Elements', disabled: true },
    { label: 'Create a heap dump', disabled: true },
    { label: 'Create a thread dump', disabled: true },
  ],
  Help: [
    { label: 'User Guide & Documentation (HTML)', action: 'openUserGuide' },
    { separator: true },
    { label: 'About JMeter Web UI', disabled: true },
  ],
}


export function MenuBar({
  commands,
  disabled,
  fileName,
  dirty,
}: {
  commands: AppCommands
  disabled: Partial<Record<keyof AppCommands, boolean>>
  fileName?: string | null
  dirty?: boolean
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const barRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [])

  return (
    <nav ref={barRef} className="menu-bar" aria-label="Application menu">
      <div className="app-mark" aria-label="JMeter Web UI"><span>JM</span></div>
      {Object.entries(menuItems).map(([menu, items]) => (
        <div className="menu-root" key={menu}>
          <button type="button" className={openMenu === menu ? 'active' : ''} onClick={() => setOpenMenu(openMenu === menu ? null : menu)}>
            {menu}
          </button>
          {openMenu === menu ? (
            <div className="dropdown-menu" role="menu">
              {items.map((item, index) => item.separator ? (
                <div className="menu-separator" key={`separator-${index}`} />
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  key={item.label}
                  disabled={item.disabled || (item.action ? disabled[item.action] : false)}
                  onClick={() => {
                    if (item.action) commands[item.action]()
                    setOpenMenu(null)
                  }}
                >
                  <span>{item.label}</span>
                  {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
      <div className="menu-spacer" />
      <button
        type="button"
        className={`app-active-file-pill ${dirty ? 'is-dirty' : ''}`}
        onClick={commands.saveAs}
        title="Click to Rename / Save Test Plan As..."
      >
        <FileCode size={13} />
        <span>{fileName || 'Untitled Test Plan'}</span>
        {dirty ? (
          <span className="file-dirty-dot" title="Unsaved changes">●</span>
        ) : (
          <span className="file-saved-check" title="Saved">✓</span>
        )}
      </button>
      <div className="desktop-label">JMeter Web UI</div>
    </nav>
  )
}
