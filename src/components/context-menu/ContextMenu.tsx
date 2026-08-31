import { ChevronRight } from 'lucide-react'
import { componentGroups, canAddChild } from '../../rules/componentRules'
import type { JMeterComponentType, TestPlanNode } from '../../models/jmeter'
import { findParent } from '../../utils/treeUtils'
import { componentMeta } from '../componentMeta'

export interface ContextMenuState {
  x: number
  y: number
  nodeId: string
  addOnly?: boolean
}

interface ContextMenuProps {
  menu: ContextMenuState
  root: TestPlanNode
  node: TestPlanNode
  hasClipboard: boolean
  clipboardType?: JMeterComponentType
  onClose: () => void
  onAdd: (type: JMeterComponentType) => void
  onCut: () => void
  onCopy: () => void
  onPaste: () => void
  onDuplicate: () => void
  onDelete: () => void
  onToggleEnabled: () => void
  onRename: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export function ContextMenu({
  menu,
  root,
  node,
  hasClipboard,
  clipboardType,
  onClose,
  onAdd,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onToggleEnabled,
  onRename,
  onMoveUp,
  onMoveDown,
}: ContextMenuProps) {
  const parent = findParent(root, node.id)
  const index = parent?.children.findIndex((child) => child.id === node.id) ?? -1
  const canPaste = Boolean(
    hasClipboard && clipboardType && canAddChild(node.type, clipboardType),
  )
  const validGroups = Object.entries(componentGroups)
    .map(([group, types]) => ({
      group,
      types: types.filter((type) => canAddChild(node.type, type)),
    }))
    .filter(({ types }) => types.length > 0)

  const invoke = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <div
      className="context-menu"
      role="menu"
      aria-label={`Actions for ${node.name}`}
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="context-submenu-row">
        <button type="button" role="menuitem" disabled={validGroups.length === 0}>
          <span>Add</span><ChevronRight size={14} />
        </button>
        {validGroups.length > 0 ? (
          <div className="context-submenu groups-menu">
            {validGroups.map(({ group, types }) => (
              <div className="context-submenu-row" key={group}>
                <button type="button" role="menuitem">
                  <span>{group}</span><ChevronRight size={14} />
                </button>
                <div className="context-submenu component-menu">
                  {types.map((type) => (
                    <button key={type} type="button" role="menuitem" onClick={() => invoke(() => onAdd(type))}>
                      {componentMeta[type].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {!menu.addOnly ? (
        <>
          <div className="menu-separator" />
          <button type="button" role="menuitem" onClick={() => invoke(onCut)} disabled={node.id === root.id}>Cut <kbd>Ctrl+X</kbd></button>
          <button type="button" role="menuitem" onClick={() => invoke(onCopy)}>Copy <kbd>Ctrl+C</kbd></button>
          <button type="button" role="menuitem" onClick={() => invoke(onPaste)} disabled={!canPaste}>Paste <kbd>Ctrl+V</kbd></button>
          <button type="button" role="menuitem" onClick={() => invoke(onDuplicate)} disabled={node.id === root.id}>Duplicate <kbd>Ctrl+D</kbd></button>
          <div className="menu-separator" />
          <button type="button" role="menuitem" onClick={() => invoke(onDelete)} disabled={node.id === root.id}>Remove <kbd>Del</kbd></button>
          <button type="button" role="menuitem" onClick={() => invoke(onToggleEnabled)}>{node.enabled ? 'Disable' : 'Enable'}</button>
          <button type="button" role="menuitem" onClick={() => invoke(onRename)}>Rename <kbd>F2</kbd></button>
          <div className="menu-separator" />
          <button type="button" role="menuitem" onClick={() => invoke(onMoveUp)} disabled={!parent || index <= 0}>Move Up</button>
          <button type="button" role="menuitem" onClick={() => invoke(onMoveDown)} disabled={!parent || index >= parent.children.length - 1}>Move Down</button>
        </>
      ) : null}
    </div>
  )
}
