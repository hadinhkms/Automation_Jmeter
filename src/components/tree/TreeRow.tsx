import type { TestPlanNode } from '../../models/jmeter'
import { TreeRowContent } from './TreeRowContent'
import type { TreeDragState, TreeProps } from '../../models/tree'
import { useTreeRowDrag } from './useTreeRowDrag'

interface TreeRowProps extends TreeDragState {
  node: TestPlanNode
  level: number
  parentName?: string
  props: TreeProps
}

export function TreeRow({ node, level, parentName, props, draggedNodeId, setDraggedNodeId }: TreeRowProps) {
  const drag = useTreeRowDrag(node, props, { draggedNodeId, setDraggedNodeId })
  const { rowRef, dropPosition, isRoot } = drag

  const expanded = props.expandedIds.has(node.id)
  const selected = props.selectedId === node.id
  const isRenaming = props.renameId === node.id
  const rowTitle = parentName
    ? `${node.name} - child of ${parentName} - level ${level + 1}`
    : `${node.name} - level ${level + 1}`

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
        onDragStart={drag.handleDragStart}
        onDragOver={drag.handleDragOver}
        onDragLeave={drag.handleDragLeave}
        onDrop={drag.handleDrop}
        onClick={() => props.onSelect(node.id)}
        onDoubleClick={() => props.onBeginRename(node.id)}
        onContextMenu={(event) => props.onContextMenu(event, node.id)}
      >
        <TreeRowContent node={node} level={level} expanded={expanded} isRenaming={isRenaming} props={props} />
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
