import { useState, useRef } from 'react'
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
  onMoveNode?: (sourceId: string, targetId: string, position: 'before' | 'inside' | 'after') => void
  fileName?: string | null
  dirty?: boolean
}

type DropPosition = 'before' | 'inside' | 'after' | null

function TreeRow({
  node,
  level,
  parentName,
  props,
  draggedNodeId,
  setDraggedNodeId,
}: {
  node: TestPlanNode
  level: number
  parentName?: string
  props: TreeProps
  draggedNodeId: string | null
  setDraggedNodeId: (id: string | null) => void
}) {
  const [dropPosition, setDropPosition] = useState<DropPosition>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  const expanded = props.expandedIds.has(node.id)
  const selected = props.selectedId === node.id
  const isRenaming = props.renameId === node.id
  const isRoot = node.id === props.root.id
  const Icon = componentMeta[node.type].icon
  const childCount = node.children.length
  const rowTitle = parentName
    ? `${node.name} - child of ${parentName} - level ${level + 1}`
    : `${node.name} - level ${level + 1}`

  const finishRename = (target: HTMLInputElement) => {
    props.onRename(node.id, target.value)
    props.onRenameEnd()
  }

  const handleDragStart = (event: React.DragEvent) => {
    if (isRoot) {
      event.preventDefault()
      return
    }
    event.stopPropagation()
    setDraggedNodeId(node.id)
    event.dataTransfer.setData('text/plain', node.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!draggedNodeId || draggedNodeId === node.id) return

    if (!rowRef.current) return
    const rect = rowRef.current.getBoundingClientRect()
    const relativeY = event.clientY - rect.top
    const height = rect.height

    const isContainer = node.id === props.root.id || node.type === 'ThreadGroup' || node.type === 'TransactionController' || node.type === 'IfController' || node.type === 'LoopController'

    let pos: DropPosition = 'after'
    if (relativeY < height * 0.3) {
      pos = isRoot ? 'inside' : 'before'
    } else if (relativeY > height * 0.7) {
      pos = 'after'
    } else if (isContainer) {
      pos = 'inside'
    } else {
      pos = relativeY < height * 0.5 ? 'before' : 'after'
    }

    setDropPosition(pos)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    if (!rowRef.current?.contains(event.relatedTarget as Node)) {
      setDropPosition(null)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const sourceId = event.dataTransfer.getData('text/plain') || draggedNodeId
    const targetPos = dropPosition
    setDropPosition(null)
    setDraggedNodeId(null)

    if (sourceId && sourceId !== node.id && targetPos && props.onMoveNode) {
      props.onMoveNode(sourceId, node.id, targetPos)
    }
  }

  return (
    <li>
      <div
        ref={rowRef}
        className={`tree-row ${selected ? 'selected' : ''} ${node.enabled ? '' : 'disabled-node'} ${
          dropPosition ? `drop-target-${dropPosition}` : ''
        } ${draggedNodeId === node.id ? 'is-dragging' : ''}`}
        style={{ paddingLeft: 6 + level * 18 }}
        data-level={level}
        title={rowTitle}
        role="treeitem"
        aria-selected={selected}
        aria-level={level + 1}
        aria-expanded={node.children.length ? expanded : undefined}
        aria-label={rowTitle}
        draggable={!isRoot && !isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => props.onSelect(node.id)}
        onDoubleClick={() => props.onBeginRename(node.id)}
        onContextMenu={(event) => props.onContextMenu(event, node.id)}
      >
        {level > 0 ? (
          <span className="tree-guides" aria-hidden="true">
            {Array.from({ length: level }).map((_, index) => (
              <span
                key={index}
                className={`tree-guide ${index === level - 1 ? 'tree-guide-current' : ''}`}
                style={{ left: 14 + index * 18 }}
              />
            ))}
          </span>
        ) : null}
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
        {childCount > 0 ? <span className="tree-child-count">{childCount}</span> : null}
      </div>
      {expanded && node.children.length > 0 ? (
        <ul role="group">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              level={level + 1}
              parentName={node.name}
              props={props}
              draggedNodeId={draggedNodeId}
              setDraggedNodeId={setDraggedNodeId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function TestPlanTree(props: TreeProps) {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)

  return (
    <aside className="tree-panel" aria-label="Test Plan Tree">
      <div className="panel-heading">
        <span title={props.fileName ? `Kịch bản: ${props.fileName}` : 'Test Plan'}>
          Test Plan {props.fileName ? <small style={{ fontWeight: 500, color: props.dirty ? '#f59e0b' : '#38bdf8', fontSize: '11px', marginLeft: '4px' }}>({props.fileName}{props.dirty ? ' *' : ''})</small> : null}
        </span>
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
          <TreeRow
            node={props.root}
            level={0}
            props={props}
            draggedNodeId={draggedNodeId}
            setDraggedNodeId={setDraggedNodeId}
          />
        </ul>
      </div>
    </aside>
  )
}
