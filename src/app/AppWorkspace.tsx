import { PanelLeftOpen } from 'lucide-react'
import type { ContextMenuState } from '../components/context-menu/ContextMenu'
import { TestPlanTree } from '../components/tree/TestPlanTree'
import { ComponentEditorRouter } from '../editors/ComponentEditorRouter'
import { WorkspaceTabs } from '../components/workspace/WorkspaceTabs'
import type { TestPlanNode } from '../models/jmeter'
import type { AppStore } from './appTypes'

interface AppWorkspaceProps {
  store: AppStore
  selectedNode: TestPlanNode
  renameId: string | null
  setRenameId: (id: string | null) => void
  setContextMenu: (menu: ContextMenuState | null) => void
  treeVisible: boolean
  setTreeVisible: (visible: boolean) => void
  treeWidth: number
  setTreeWidth: (width: number) => void
  isResizingTree: boolean
  onTreeResizeStart: (e: React.MouseEvent) => void
}

/** Main workspace: test plan tree, resizer and component editor. */
export function AppWorkspace(props: AppWorkspaceProps) {
  const { store, selectedNode, renameId, setRenameId, setContextMenu, treeVisible, setTreeVisible, treeWidth, setTreeWidth, isResizingTree, onTreeResizeStart } = props
  return (
    <main
      className={`workspace ${treeVisible ? '' : 'tree-collapsed'} ${isResizingTree ? 'resizing-tree' : ''}`}
      style={treeVisible ? { gridTemplateColumns: `${treeWidth}px 5px minmax(0, 1fr)` } : undefined}
    >
      {treeVisible ? (
        <>
          <TestPlanTree
            root={store.testPlan}
            selectedId={store.selectedNodeId}
            expandedIds={store.expandedNodeIds}
            renameId={renameId}
            fileName={store.fileName}
            dirty={store.dirty}
            onSelect={store.selectNode}
            onToggle={store.toggleExpanded}
            onContextMenu={(event, nodeId) => {
              event.preventDefault()
              event.stopPropagation()
              store.selectNode(nodeId)
              const x = Math.min(event.clientX, window.innerWidth - 430)
              const y = Math.min(event.clientY, window.innerHeight - 390)
              setContextMenu({ x: Math.max(4, x), y: Math.max(4, y), nodeId })
            }}
            onRename={store.renameNode}
            onBeginRename={setRenameId}
            onRenameEnd={() => setRenameId(null)}
            onAddClick={(event) => {
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              setContextMenu({ x: rect.left, y: rect.bottom + 4, nodeId: selectedNode.id, addOnly: true })
            }}
            onCollapsePanel={() => setTreeVisible(false)}
            onMoveNode={store.moveNode}
          />
          <div
            className={`workspace-resizer ${isResizingTree ? 'is-dragging' : ''}`}
            onMouseDown={onTreeResizeStart}
            onDoubleClick={() => setTreeWidth(360)}
            title="Kéo sang trái/phải để chỉnh độ rộng thanh Test Plan (Nháy đúp để reset về 360px)"
          />
        </>
      ) : (
        <button type="button" className="restore-tree-button" title="Show test plan tree" aria-label="Show test plan tree" onClick={() => setTreeVisible(true)}>
          <PanelLeftOpen size={17} />
        </button>
      )}

      <ComponentEditorRouter
        node={selectedNode}
        updateNode={(updates) => store.updateNode(selectedNode.id, updates)}
        updateProperties={(updates) => store.updateNodeProperties(selectedNode.id, updates)}
        resultsCleared={store.resultsCleared}
        tabs={<WorkspaceTabs root={store.testPlan} selectedId={store.selectedNodeId} onSelect={store.selectNode} />}
      />
    </main>
  )
}
