import { useMemo } from 'react'
import type { AppCommands } from '../../components/menu/MenuBar'
import type { TestPlanNode } from '../../models/jmeter'
import type { ActiveModal, AppStore } from '../appTypes'

interface AppCommandDeps {
  store: AppStore
  selectedNode: TestPlanNode
  canPaste: boolean
  activeModal: ActiveModal
  toggleModal: (modal: ActiveModal) => void
  openJmx: () => void
  file: {
    newPlan: () => void
    savePlan: () => Promise<void>
    saveAsPlan: () => void
    exportJmx: () => Promise<void>
    removeSelected: () => void
    openHtmlReport: () => void
  }
  run: { startTest: () => Promise<void>; stopTest: () => Promise<void> }
}

/** Memoised command map shared by MenuBar, Toolbar and keyboard shortcuts, plus disabled flags. */
export function useAppCommands({ store, selectedNode, canPaste, activeModal, toggleModal, openJmx, file, run }: AppCommandDeps) {
  const commands = useMemo<AppCommands>(() => ({
    newPlan: file.newPlan,
    openJmx,
    save: file.savePlan,
    saveAs: file.saveAsPlan,
    exportJmx: file.exportJmx,
    cut: () => store.cutNode(selectedNode.id),
    copy: () => store.copyNode(selectedNode.id),
    paste: () => store.pasteNode(selectedNode.id),
    duplicate: () => store.duplicateNode(selectedNode.id),
    remove: file.removeSelected,
    start: run.startTest,
    stop: run.stopTest,
    shutdown: run.stopTest,
    clear: store.clearResults,
    toggleConsole: () => store.setConsoleOpen(!store.isConsoleOpen),
    openSettings: () => toggleModal('settings'),
    openHtmlReport: file.openHtmlReport,
    importCurl: () => toggleModal('curl'),
    importPostman: () => toggleModal('postman'),
    openBrowserRecorder: () => toggleModal('recorder'),
    openPluginsManager: () => toggleModal('plugins'),
    openAssetManager: () => toggleModal('assets'),
    openTemplateGallery: () => toggleModal('templates'),
    openWorkloadGraph: () => toggleModal('workload'),
    openSlaSettings: () => toggleModal('sla'),
    openGitManager: () => toggleModal('git'),
    openMockServer: () => toggleModal('mock'),
    openDdtWizard: () => toggleModal('ddt'),
    openUserGuide: () => window.open('/docs/index.html', '_blank'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [selectedNode.id, store.dirty, store.fileName, store.testPlan, store.executionMode, store.activeRunId, store.isConsoleOpen, activeModal])

  const disabled: Partial<Record<keyof AppCommands, boolean>> = {
    save: !store.dirty && Boolean(store.fileName),
    cut: selectedNode.id === store.testPlan.id,
    paste: !canPaste,
    duplicate: selectedNode.id === store.testPlan.id,
    remove: selectedNode.id === store.testPlan.id,
    start: store.runState === 'RUNNING',
    stop: false,
    shutdown: false,
    clear: store.metrics.samples === 0 && store.runState !== 'RUNNING',
  }

  return { commands, disabled }
}
