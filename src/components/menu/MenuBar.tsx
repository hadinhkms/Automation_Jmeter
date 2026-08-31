import { useEffect, useRef, useState } from 'react'

export interface AppCommands {
  newPlan: () => void
  openJmx: () => void
  save: () => void
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
    { separator: true },
    { label: 'Save', shortcut: 'Ctrl+S', action: 'save' },
    { label: 'Export JMX…', action: 'exportJmx' },
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
    { label: 'Clear Results', action: 'clear' },
  ],
  Options: [{ label: 'Look and Feel', disabled: true }],
  Tools: [{ label: 'Function Helper Dialog', disabled: true }],
  Help: [{ label: 'About JMeter Web UI', disabled: true }],
}

export function MenuBar({ commands, disabled }: { commands: AppCommands; disabled: Partial<Record<keyof AppCommands, boolean>> }) {
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
      <div className="desktop-label">JMeter Web UI</div>
    </nav>
  )
}
