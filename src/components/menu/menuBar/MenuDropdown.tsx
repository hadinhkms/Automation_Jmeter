import type { AppCommands, DisabledCommands } from '../../../models/appCommands'
import type { MenuItem } from './menuItems'

export function MenuDropdown({
  items,
  commands,
  disabled,
  onClose,
}: {
  items: MenuItem[]
  commands: AppCommands
  disabled: DisabledCommands
  onClose: () => void
}) {
  return (
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
            onClose()
          }}
        >
          <span>{item.label}</span>
          {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
        </button>
      ))}
    </div>
  )
}
