import { useState } from 'react'
import { PanelLeftClose, Plus } from 'lucide-react'
import { TreeRow } from './TreeRow'
import type { TreeProps } from './treeTypes'

export function TestPlanTree(props: TreeProps) {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const fileNameStyle = {
    fontWeight: 500,
    color: props.dirty ? '#f59e0b' : '#38bdf8',
    fontSize: '11px',
    marginLeft: '4px',
  }

  return (
    <aside className="tree-panel" aria-label="Test Plan Tree">
      <div className="panel-heading">
        <span title={props.fileName ? `Kịch bản: ${props.fileName}` : 'Test Plan'}>
          Test Plan {props.fileName ? <small style={fileNameStyle}>({props.fileName}{props.dirty ? ' *' : ''})</small> : null}
        </span>
        <div className="panel-heading-actions">
          <button type="button" title="Add component" aria-label="Add component" onClick={props.onAddClick}>
            <Plus size={15} />
          </button>
          <button
            type="button"
            title="Collapse tree panel"
            aria-label="Collapse tree panel"
            onClick={props.onCollapsePanel}
          >
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
