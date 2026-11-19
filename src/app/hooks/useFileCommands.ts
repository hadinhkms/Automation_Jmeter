import { localProjectService } from '../../services/projectService'
import { jmeterRunnerService } from '../../services/jmeterRunnerService'
import type { TestPlanNode } from '../../models/jmeter'
import type { ActiveModal, AppStore, NotifyFn } from '../appTypes'

interface FileCommandDeps {
  store: AppStore
  selectedNode: TestPlanNode
  dismissNoticeLater: NotifyFn
  openModal: (modal: ActiveModal) => void
  setIsPromptBeforeRun: (value: boolean) => void
}

/** New / open / save / export / remove commands and the hidden JMX file input handler. */
export function useFileCommands({ store, selectedNode, dismissNoticeLater, openModal, setIsPromptBeforeRun }: FileCommandDeps) {
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
      const defaultName = store.fileName || `${store.testPlan.name.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Test_Plan'}.jmx`
      link.download = defaultName.endsWith('.jmx') ? defaultName : `${defaultName}.jmx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
      store.markSaved(link.download)
      dismissNoticeLater(`Saved and exported ${link.download} successfully.`)
    } catch (error) {
      dismissNoticeLater(error instanceof Error ? error.message : 'Could not export JMX.', 'error')
    }
  }

  const removeSelected = () => {
    if (selectedNode.id === store.testPlan.id) return
    if (selectedNode.children.length > 0 && !window.confirm(`Remove â€œ${selectedNode.name}â€ and all of its children?`)) return
    store.deleteNode(selectedNode.id)
  }

  const openHtmlReport = () => {
    if (store.activeRunId) {
      window.open(jmeterRunnerService.getReportUrl(store.activeRunId), '_blank')
    } else {
      dismissNoticeLater('No HTML report available. Run a test first.', 'error')
    }
  }

  const savePlan = async () => {
    if (!store.fileName) {
      setIsPromptBeforeRun(false)
      openModal('save')
      return
    }
    await exportJmx()
  }

  const saveAsPlan = () => {
    setIsPromptBeforeRun(false)
    openModal('save')
  }

  const handleJmxInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (store.dirty && !window.confirm('Discard unsaved changes and open this JMX file?')) return
    try {
      const testPlan = await localProjectService.openJmx(file)
      store.replaceTestPlan(testPlan, file.name)
      dismissNoticeLater(`Opened ${file.name}`)
    } catch (error) {
      dismissNoticeLater(error instanceof Error ? error.message : 'Could not open this JMX file.', 'error')
    }
  }

  return { newPlan, exportJmx, removeSelected, openHtmlReport, savePlan, saveAsPlan, handleJmxInputChange }
}
