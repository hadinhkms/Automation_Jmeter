import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, PanelLeftOpen, X } from 'lucide-react'
import { ContextMenu, type ContextMenuState } from '../components/context-menu/ContextMenu'
import { StatusBar } from '../components/layout/StatusBar'
import { MenuBar, type AppCommands } from '../components/menu/MenuBar'
import { Toolbar } from '../components/toolbar/Toolbar'
import { TestPlanTree } from '../components/tree/TestPlanTree'
import { ComponentEditorRouter } from '../editors/ComponentEditorRouter'
import { canAddChild } from '../rules/componentRules'
import { localProjectService } from '../services/projectService'
import { useJMeterStore } from '../store/jmeterStore'
import { findNode } from '../utils/treeUtils'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}

export function App() {
  const store = useJMeterStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [treeVisible, setTreeVisible] = useState(true)
  const [notice, setNotice] = useState<{ type: 'error' | 'info'; message: string } | null>(null)

  const selectedNode = findNode(store.testPlan, store.selectedNodeId) ?? store.testPlan
  const menuNode = contextMenu ? findNode(store.testPlan, contextMenu.nodeId) : null
  const canPaste = Boolean(
    store.clipboard && canAddChild(selectedNode.type, store.clipboard.node.type),
  )

  const dismissNoticeLater = (message: string, type: 'error' | 'info' = 'info') => {
    setNotice({ message, type })
  }

  const newPlan = () => {
    if (store.dirty && !window.confirm('Discard unsaved changes and create a new test plan?')) return
    store.newTestPlan()
    dismissNoticeLater('New test plan created.')
  }

  const exportJmx = async () => {
    try {
      const xml = await localProjectService.exportJmx(store.testPlan)
      const blobUrl = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${store.testPlan.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'test-plan'}.jmx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
      store.markSaved()
      dismissNoticeLater('JMX exported successfully.')
    } catch (error) {
      dismissNoticeLater(error instanceof Error ? error.message : 'Could not export JMX.', 'error')
    }
  }

  const removeSelected = () => {
    if (selectedNode.id === store.testPlan.id) return
    if (selectedNode.children.length > 0 && !window.confirm(`Remove “${selectedNode.name}” and all of its children?`)) return
    store.deleteNode(selectedNode.id)
  }

  const commands = useMemo<AppCommands>(() => ({
    newPlan,
    openJmx: () => fileInputRef.current?.click(),
    save: () => {
      store.markSaved()
      dismissNoticeLater('Changes saved in the current browser session.')
    },
    exportJmx,
    cut: () => store.cutNode(selectedNode.id),
    copy: () => store.copyNode(selectedNode.id),
    paste: () => store.pasteNode(selectedNode.id),
    duplicate: () => store.duplicateNode(selectedNode.id),
    remove: removeSelected,
    start: store.startRun,
    stop: store.stopRun,
    shutdown: store.stopRun,
    clear: store.clearResults,
  // Store action references are stable and selectedNode.id captures the active selection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [selectedNode.id, store.dirty, store.testPlan])

  const disabled: Partial<Record<keyof AppCommands, boolean>> = {
    save: !store.dirty,
    cut: selectedNode.id === store.testPlan.id,
    paste: !canPaste,
    duplicate: selectedNode.id === store.testPlan.id,
    remove: selectedNode.id === store.testPlan.id,
    start: store.runState === 'RUNNING',
    stop: store.runState !== 'RUNNING',
    shutdown: store.runState !== 'RUNNING',
    clear: store.metrics.samples === 0 && store.runState !== 'RUNNING',
  }

  useEffect(() => {
    if (store.runState !== 'RUNNING') return
    const interval = window.setInterval(store.tickRun, 1000)
    return () => window.clearInterval(interval)
  }, [store.runState, store.tickRun])

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
        setRenameId(null)
        return
      }
      if (isEditableTarget(event.target)) return
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault()
        commands.save()
      } else if (modifier && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        commands.newPlan()
      } else if (modifier && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        commands.openJmx()
      } else if (modifier && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        if (store.runState !== 'RUNNING') commands.start()
      } else if (modifier && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        commands.copy()
      } else if (modifier && event.key.toLowerCase() === 'x') {
        event.preventDefault()
        commands.cut()
      } else if (modifier && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        commands.paste()
      } else if (modifier && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        commands.duplicate()
      } else if (event.key === 'Delete') {
        event.preventDefault()
        commands.remove()
      } else if (event.key === 'F2') {
        event.preventDefault()
        setRenameId(store.selectedNodeId)
      }
    }
    window.addEventListener('click', closeMenu)
    window.addEventListener('blur', closeMenu)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('blur', closeMenu)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [commands, store.runState, store.selectedNodeId])

  return (
    <div className="app-shell">
      <MenuBar commands={commands} disabled={disabled} />
      <Toolbar commands={commands} disabled={disabled} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".jmx,.xml,application/xml,text/xml"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          if (store.dirty && !window.confirm('Discard unsaved changes and open this JMX file?')) return
          try {
            const testPlan = await localProjectService.openJmx(file)
            store.replaceTestPlan(testPlan)
            dismissNoticeLater(`Opened ${file.name}`)
          } catch (error) {
            dismissNoticeLater(error instanceof Error ? error.message : 'Could not open this JMX file.', 'error')
          }
        }}
      />
      {notice ? (
        <div className={`notice-banner ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <AlertCircle size={15} />
          <span>{notice.message}</span>
          <button type="button" aria-label="Dismiss notification" title="Dismiss" onClick={() => setNotice(null)}><X size={14} /></button>
        </div>
      ) : null}
      <main className={`workspace ${treeVisible ? '' : 'tree-collapsed'}`}>
        {treeVisible ? (
          <TestPlanTree
            root={store.testPlan}
            selectedId={store.selectedNodeId}
            expandedIds={store.expandedNodeIds}
            renameId={renameId}
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
          />
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
        />
      </main>
      <StatusBar state={store.runState} metrics={store.metrics} dirty={store.dirty} />
      {contextMenu && menuNode ? (
        <ContextMenu
          menu={contextMenu}
          root={store.testPlan}
          node={menuNode}
          hasClipboard={Boolean(store.clipboard)}
          clipboardType={store.clipboard?.node.type}
          onClose={() => setContextMenu(null)}
          onAdd={(type) => store.addNode(menuNode.id, type)}
          onCut={() => store.cutNode(menuNode.id)}
          onCopy={() => store.copyNode(menuNode.id)}
          onPaste={() => store.pasteNode(menuNode.id)}
          onDuplicate={() => store.duplicateNode(menuNode.id)}
          onDelete={() => {
            if (menuNode.id === store.testPlan.id) return
            if (menuNode.children.length === 0 || window.confirm(`Remove “${menuNode.name}” and all of its children?`)) store.deleteNode(menuNode.id)
          }}
          onToggleEnabled={() => store.toggleEnabled(menuNode.id)}
          onRename={() => setRenameId(menuNode.id)}
          onMoveUp={() => store.moveNodeUp(menuNode.id)}
          onMoveDown={() => store.moveNodeDown(menuNode.id)}
        />
      ) : null}
    </div>
  )
}
