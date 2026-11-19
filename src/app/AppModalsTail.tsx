import { WorkloadGraphModal } from '../components/common/WorkloadGraphModal'
import { SlaSettingsModal } from '../components/common/SlaSettingsModal'
import { GitManagerModal } from '../components/common/GitManagerModal'
import { ImportPostmanModal } from '../components/common/postman/ImportPostmanModal'
import { MockServerManagerModal } from '../components/common/mock/MockServerManagerModal'
import { DdtWizardModal } from '../components/common/ddt/DdtWizardModal'
import type { SlaThresholds, WebhookConfig } from '../models/jmeter'
import type { AppModalsProps } from './AppModals'

/** Second half of the modal host (workload, SLA, git, Postman, mock server, DDT). */
export function AppModalsTail({ store, activeModal, closeModal, selectedNode, dismissNoticeLater }: AppModalsProps) {
  return (
    <>
      <WorkloadGraphModal
        isOpen={activeModal === 'workload'}
        onClose={closeModal}
        testPlan={store.testPlan}
      />
      <SlaSettingsModal
        isOpen={activeModal === 'sla'}
        onClose={closeModal}
        // SAFETY: test-plan property is written only by its own settings editor with this shape; undefined when unset
        thresholds={store.testPlan.properties.slaThresholds as SlaThresholds | undefined}
        // SAFETY: test-plan property is written only by its own settings editor with this shape; undefined when unset
        webhook={store.testPlan.properties.webhook as WebhookConfig | undefined}
        onSave={(slaThresholds, webhook) => {
          store.updateNodeProperties(store.testPlan.id, { slaThresholds, webhook })
          dismissNoticeLater('SLA quality gates and alert configurations updated.')
        }}
      />
      <GitManagerModal
        isOpen={activeModal === 'git'}
        onClose={closeModal}
      />
      <ImportPostmanModal
        isOpen={activeModal === 'postman'}
        testPlan={store.testPlan}
        onClose={closeModal}
        onImport={(nodes, targetParentId) => {
          for (const node of nodes) {
            store.insertNode(targetParentId, node)
          }
          dismissNoticeLater(`Successfully imported ${nodes.length} element(s) from Postman Collection.`)
        }}
      />
      <MockServerManagerModal isOpen={activeModal === 'mock'} onClose={closeModal} />
      <DdtWizardModal
        isOpen={activeModal === 'ddt'}
        targetName={selectedNode.name}
        onClose={closeModal}
        onInsert={(node) => { store.insertNode(selectedNode.id, node); dismissNoticeLater(`Added "${node.name}" – use the mapped \${variables} in your samplers.`) }}
      />
    </>
  )
}
