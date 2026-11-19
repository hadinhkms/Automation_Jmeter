import { JMeterSettingsModal } from '../components/common/JMeterSettingsModal'
import { ImportCurlModal } from '../components/common/ImportCurlModal'
import { BrowserRecorderModal } from '../components/common/BrowserRecorderModal'
import { PluginsManagerModal } from '../components/common/PluginsManagerModal'
import { SaveTestPlanModal } from '../components/common/SaveTestPlanModal'
import { AssetManagerModal } from '../components/common/AssetManagerModal'
import { TemplateGalleryModal } from '../components/common/TemplateGalleryModal'
import type { TestPlanNode } from '../models/jmeter'
import type { ActiveModal, AppStore, NotifyFn } from './appTypes'
import { AppModalsTail } from './AppModalsTail'

export interface AppModalsProps {
  store: AppStore
  activeModal: ActiveModal
  closeModal: () => void
  isPromptBeforeRun: boolean
  selectedNode: TestPlanNode
  executeRun: () => void
  dismissNoticeLater: NotifyFn
}

/** Modal host: every app-level dialog, driven by the single `activeModal` key (DOM order preserved). */
export function AppModals(props: AppModalsProps) {
  const { store, activeModal, closeModal, isPromptBeforeRun, selectedNode, executeRun, dismissNoticeLater } = props
  return (
    <>
      <JMeterSettingsModal
        isOpen={activeModal === 'settings' || store.isSettingsOpen}
        onClose={closeModal}
      />
      <SaveTestPlanModal
        isOpen={activeModal === 'save'}
        isPromptBeforeRun={isPromptBeforeRun}
        onClose={closeModal}
        onSavedAndRun={() => {
          closeModal()
          executeRun()
        }}
        onRunWithoutSaving={() => {
          closeModal()
          executeRun()
        }}
      />
      <ImportCurlModal
        isOpen={activeModal === 'curl'}
        targetNode={selectedNode}
        onClose={closeModal}
        onImport={(samplerNode, targetParentId) => {
          store.insertNode(targetParentId || selectedNode.id, samplerNode)
          dismissNoticeLater(`Imported cURL into "${samplerNode.name}" successfully.`)
        }}
      />
      <BrowserRecorderModal
        isOpen={activeModal === 'recorder'}
        targetNode={selectedNode}
        testPlanRoot={store.testPlan}
        onClose={closeModal}
        onImport={(nodes, targetParentId) => {
          for (const node of nodes) {
            store.insertNode(targetParentId, node)
          }
          dismissNoticeLater(`Successfully imported ${nodes.length} element(s) into test plan.`)
        }}
      />
      <PluginsManagerModal
        isOpen={activeModal === 'plugins'}
        onClose={closeModal}
      />
      <AssetManagerModal
        isOpen={activeModal === 'assets'}
        onClose={closeModal}
      />
      <TemplateGalleryModal
        isOpen={activeModal === 'templates'}
        onClose={closeModal}
        onSelectTemplate={(plan) => {
          store.replaceTestPlan(plan, `${plan.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.jmx`)
          dismissNoticeLater(`Loaded template: "${plan.name}" successfully.`)
        }}
      />
      <AppModalsTail {...props} />
    </>
  )
}
