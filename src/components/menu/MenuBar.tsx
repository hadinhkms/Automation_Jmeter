import { useEffect, useRef, useState } from 'react'
import type { AppCommands, DisabledCommands } from '../../models/appCommands'
import { menuItems } from './menuBar/menuItems'
import { MenuDropdown } from './menuBar/MenuDropdown'
import { ActiveFilePill } from './menuBar/ActiveFilePill'

export type { AppCommands } from '../../models/appCommands'

export function MenuBar({
  commands,
  disabled,
  fileName,
  dirty,
}: {
  commands: AppCommands
  disabled: DisabledCommands
  fileName?: string | null
  dirty?: boolean
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const barRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      // SAFETY: DOM event targets are Nodes (or null, which contains() treats as false)
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
            <MenuDropdown items={items} commands={commands} disabled={disabled} onClose={() => setOpenMenu(null)} />
          ) : null}
        </div>
      ))}
      <div className="menu-spacer" />
      <ActiveFilePill fileName={fileName} dirty={dirty} onClick={commands.saveAs} />
      <div className="desktop-label">JMeter Web UI</div>
    </nav>
  )
}
