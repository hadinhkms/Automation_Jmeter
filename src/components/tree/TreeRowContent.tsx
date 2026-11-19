import { ChevronDown, ChevronRight } from 'lucide-react'
import { componentMeta } from '../componentMeta'
import type { TestPlanNode } from '../../models/jmeter'
import type { TreeProps } from '../../models/tree'

interface TreeRowContentProps {
  node: TestPlanNode
  level: number
  expanded: boolean
  isRenaming: boolean
  props: TreeProps
}

/** Inner content of a tree row: guides, chevron, icon, label/rename input and child count. */
export function TreeRowContent({ node, level, expanded, isRenaming, props }: TreeRowContentProps) {
  const Icon = componentMeta[node.type].icon
  const childCount = node.children.length

  const finishRename = (target: HTMLInputElement) => {
    props.onRename(node.id, target.value)
    props.onRenameEnd()
  }

  return (
    <>
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
    </>
  )
}
