import { ContextMenu, type ContextMenuState } from '../components/context-menu/ContextMenu'
import type { TestPlanNode } from '../models/jmeter'
import type { ActiveModal, AppStore } from './appTypes'

export function AppContextMenu({
  contextMenu,
  menuNode,
  store,
  toggleModal,
  setContextMenu,
  setRenameId,
}: {
  contextMenu: ContextMenuState
  menuNode: TestPlanNode
  store: AppStore
  toggleModal: (modal: ActiveModal) => void
  setContextMenu: (menu: ContextMenuState | null) => void
  setRenameId: (id: string | null) => void
}) {
  return (
    <ContextMenu
      menu={contextMenu}
      root={store.testPlan}
      node={menuNode}
      hasClipboard={Boolean(store.clipboard)}
      clipboardType={store.clipboard?.node.type}
      onClose={() => setContextMenu(null)}
      onAdd={(type) => store.addNode(menuNode.id, type)}
      onImportCurl={() => toggleModal('curl')}
      onOpenRecorder={() => toggleModal('recorder')}
      onCut={() => store.cutNode(menuNode.id)}
      onCopy={() => store.copyNode(menuNode.id)}
      onPaste={() => store.pasteNode(menuNode.id)}
      onDuplicate={() => store.duplicateNode(menuNode.id)}
      onDelete={() => {
        if (menuNode.id === store.testPlan.id) return
        if (menuNode.children.length === 0 || window.confirm(`Remove â€œ${menuNode.name}â€ and all of its children?`)) store.deleteNode(menuNode.id)
      }}
      onToggleEnabled={() => store.toggleEnabled(menuNode.id)}
      onRename={() => setRenameId(menuNode.id)}
      onMoveToTop={() => store.moveNodeToTop(menuNode.id)}
      onMoveUp={() => store.moveNodeUp(menuNode.id)}
      onMoveDown={() => store.moveNodeDown(menuNode.id)}
      onMoveToBottom={() => store.moveNodeToBottom(menuNode.id)}
    />
  )
}
