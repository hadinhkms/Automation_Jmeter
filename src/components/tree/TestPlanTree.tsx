import { ChevronDown, ChevronRight, PanelLeftClose, Plus } from 'lucide-react'
import { componentMeta } from '../componentMeta'
import type { TestPlanNode } from '../../models/jmeter'

interface TreeProps {
  root: TestPlanNode
  selectedId: string
  expandedIds: Set<string>
  renameId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onRename: (id: string, name: string) => void
  onBeginRename: (id: string) => void
  onRenameEnd: () => void
  onAddClick: (event: React.MouseEvent) => void
  onCollapsePanel: () => void
}

function TreeRow({
  node,
  level,
  props,
}: {
  node: TestPlanNode
  level: number
  props: TreeProps
}) {
  const expanded = props.expandedIds.has(node.id)
  const selected = props.selectedId === node.id
  const isRenaming = props.renameId === node.id
  const Icon = componentMeta[node.type].icon

  const finishRename = (target: HTMLInputElement) => {
    props.onRename(node.id, target.value)
    props.onRenameEnd()
  }

  return (
    <li>
      <div
        className={`tree-row ${selected ? 'selected' : ''} ${node.enabled ? '' : 'disabled-node'}`}
        style={{ paddingLeft: 6 + level * 18 }}
        role="treeitem"
        aria-selected={selected}
        aria-expanded={node.children.length ? expanded : undefined}
        onClick={() => props.onSelect(node.id)}
        onDoubleClick={() => props.onBeginRename(node.id)}
        onContextMenu={(event) => props.onContextMenu(event, node.id)}
      >
        <button
          type="button"
          className="tree-chevron"
          title={expanded ? 'Collapse' : 'Expand'}
          aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          disabled={node.children.length === 0}
          onClick={(event) => {
            event.stopPropagation()
            props.onToggle(node.id)
          }}
        >
          {node.children.length ? expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}
        </button>
        <Icon size={15} className={`node-icon tone-${componentMeta[node.type].tone}`} />
        {isRenaming ? (
          <input
            className="tree-rename-input"
            defaultValue={node.name}
            autoFocus
            aria-label="Rename component"
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => finishRename(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') finishRename(event.currentTarget)
              if (event.key === 'Escape') props.onRenameEnd()
            }}
          />
        ) : (
          <span className="tree-label">{node.name}</span>
        )}
      </div>
      {expanded && node.children.length > 0 ? (
        <ul role="group">
          {node.children.map((child) => (
            <TreeRow key={child.id} node={child} level={level + 1} props={props} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function TestPlanTree(props: TreeProps) {
  return (
    <aside className="tree-panel" aria-label="Test Plan Tree">
      <div className="panel-heading">
        <span>Test Plan</span>
        <div className="panel-heading-actions">
          <button type="button" title="Add component" aria-label="Add component" onClick={props.onAddClick}>
            <Plus size={15} />
          </button>
          <button type="button" title="Collapse tree panel" aria-label="Collapse tree panel" onClick={props.onCollapsePanel}>
            <PanelLeftClose size={15} />
          </button>
        </div>
      </div>
      <div className="tree-scroll">
        <ul className="test-plan-tree" role="tree" aria-label="Test Plan components">
          <TreeRow node={props.root} level={0} props={props} />
        </ul>
      </div>
    </aside>
  )
}
