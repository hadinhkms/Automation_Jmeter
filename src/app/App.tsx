import { useRef, useState } from 'react'
import type { ContextMenuState } from '../components/context-menu/ContextMenu'
import { StatusBar } from '../components/layout/StatusBar'
import { MenuBar } from '../components/menu/MenuBar'
import { Toolbar } from '../components/toolbar/Toolbar'
import { ConsoleLogDrawer } from '../components/layout/ConsoleLogDrawer'
import { canAddChild } from '../rules/componentRules'
import { useJMeterStore } from '../store/jmeterStore'
import { findNode } from '../utils/treeUtils'
import { selectResultsListenerNode } from './appHelpers'
import type { AppNotice } from './appTypes'
import { useModalState } from './hooks/useModalState'
import { useTreeResize } from './hooks/useTreeResize'
import { useMockRunTicker, useRunnerBootstrap } from './hooks/useRunnerBootstrap'
import { useRunControl } from './hooks/useRunControl'
import { useFileCommands } from './hooks/useFileCommands'
import { useAppCommands } from './hooks/useAppCommands'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useGlobalDrop } from './hooks/useGlobalDrop'
import { GlobalDropOverlay } from './GlobalDropOverlay'
import { AppBanners } from './AppBanners'
import { AppWorkspace } from './AppWorkspace'
import { AppContextMenu } from './AppContextMenu'
import { AppModals } from './AppModals'

export type { ActiveModal } from './appTypes'

export function App() {
  const store = useJMeterStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [treeVisible, setTreeVisible] = useState(true)
  const [notice, setNotice] = useState<AppNotice | null>(null)
  const modals = useModalState(store)
  const { activeModal, openModal, closeModal, toggleModal, isPromptBeforeRun, setIsPromptBeforeRun } = modals
  const tree = useTreeResize()

  const selectedNode = findNode(store.testPlan, store.selectedNodeId) ?? store.testPlan
  const menuNode = contextMenu ? findNode(store.testPlan, contextMenu.nodeId) : null
  const canPaste = Boolean(
    store.clipboard && canAddChild(selectedNode.type, store.clipboard.node.type),
  )

  const dismissNoticeLater = (message: string, type: 'error' | 'info' = 'info') => {
    setNotice({ message, type })
  }

  const selectResultsListener = () => selectResultsListenerNode(store)

  useRunnerBootstrap(store, selectResultsListener)

  const file = useFileCommands({ store, selectedNode, dismissNoticeLater, openModal, setIsPromptBeforeRun })
  const run = useRunControl({ store, dismissNoticeLater, selectResultsListener, openModal, setIsPromptBeforeRun })
  const { commands, disabled } = useAppCommands({
    store, selectedNode, canPaste, activeModal, toggleModal, openJmx: () => fileInputRef.current?.click(), file, run,
  })

  useMockRunTicker(store)
  useKeyboardShortcuts(commands, store, setContextMenu, setRenameId)
  const { globalDragOver, dragFileType, dropHandlers } = useGlobalDrop(store, dismissNoticeLater)

  return (
    <div className={`app-shell ${globalDragOver ? 'global-drag-active' : ''}`} {...dropHandlers}>
      {globalDragOver ? <GlobalDropOverlay dragFileType={dragFileType} /> : null}

      <MenuBar commands={commands} disabled={disabled} fileName={store.fileName} dirty={store.dirty} />
      <Toolbar commands={commands} disabled={disabled} activeModal={activeModal} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".jmx,.xml,application/xml,text/xml"
        hidden
        onChange={file.handleJmxInputChange}
      />
      <AppBanners store={store} notice={notice} setNotice={setNotice} stopTest={run.stopTest} dismissNoticeLater={dismissNoticeLater} />

      <AppWorkspace
        store={store}
        selectedNode={selectedNode}
        renameId={renameId}
        setRenameId={setRenameId}
        setContextMenu={setContextMenu}
        treeVisible={treeVisible}
        setTreeVisible={setTreeVisible}
        treeWidth={tree.treeWidth}
        setTreeWidth={tree.setTreeWidth}
        isResizingTree={tree.isResizingTree}
        onTreeResizeStart={tree.handleTreeResizeStart}
      />

      <StatusBar state={store.runState} metrics={store.metrics} dirty={store.dirty} fileName={store.fileName} />

      {contextMenu && menuNode ? (
        <AppContextMenu
          contextMenu={contextMenu}
          menuNode={menuNode}
          store={store}
          toggleModal={toggleModal}
          setContextMenu={setContextMenu}
          setRenameId={setRenameId}
        />
      ) : null}

      <ConsoleLogDrawer />
      <AppModals
        store={store}
        activeModal={activeModal}
        closeModal={closeModal}
        isPromptBeforeRun={isPromptBeforeRun}
        selectedNode={selectedNode}
        executeRun={run.executeRun}
        dismissNoticeLater={dismissNoticeLater}
      />
    </div>
  )
}
