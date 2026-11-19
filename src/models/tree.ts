import type { TestPlanNode } from './jmeter'

export interface TreeProps {
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

export type DropPosition = 'before' | 'inside' | 'after' | null

export interface TreeDragState {
  draggedNodeId: string | null
  setDraggedNodeId: (id: string | null) => void
}
