import { useEffect } from 'react'
import type { AppCommands } from '../../components/menu/MenuBar'
import type { ContextMenuState } from '../../components/context-menu/ContextMenu'
import { isEditableTarget } from '../appHelpers'
import type { AppStore } from '../appTypes'

/** Global keyboard shortcuts, context-menu auto-close and document title sync. */
export function useKeyboardShortcuts(
  commands: AppCommands,
  store: AppStore,
  setContextMenu: (menu: ContextMenuState | null) => void,
  setRenameId: (id: string | null) => void,
) {
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
      if (modifier && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        commands.saveAs()
      } else if (modifier && event.shiftKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        commands.openBrowserRecorder()
      } else if (modifier && event.key.toLowerCase() === 's') {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands, store.runState, store.selectedNodeId])

  useEffect(() => {
    const title = store.fileName
      ? `${store.fileName}${store.dirty ? ' *' : ''} - JMeter Web UI`
      : `${store.testPlan.name}${store.dirty ? ' *' : ''} - JMeter Web UI`
    document.title = title
  }, [store.fileName, store.testPlan.name, store.dirty])
}
