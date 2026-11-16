import { useState } from 'react'
import type { RecordedRequest } from '../../models/recorder'
import type { TestPlanNode } from '../../models/jmeter'
import { convertRecordedRequestsToNodes } from '../../utils/recordedRequestConverter'
import { detectCorrelations, applyCorrelationsToTree, type CorrelationCandidate } from '../../utils/correlationDetector'
import { buildConversionOptions, pickSelected } from './recorderLogic'
import type { ImportOptionsModel } from './useImportOptions'

interface ImportActionDeps {
  filteredRequests: RecordedRequest[]
  selectedReqIds: Set<string>
  options: ImportOptionsModel
  setErrorNotice: (msg: string | null) => void
  onImport: (nodes: TestPlanNode[], targetParentId: string) => void
  onClose: () => void
}

/** Smart-correlation wizard + import of selected requests into the Test Plan. */
export function useImportActions(d: ImportActionDeps) {
  const [isCorrelationWizardOpen, setIsCorrelationWizardOpen] = useState(false)
  const [correlationCandidates, setCorrelationCandidates] = useState<CorrelationCandidate[]>([])

  const handleOpenCorrelationWizard = () => {
    const requestsToImport = pickSelected(d.filteredRequests, d.selectedReqIds)
    if (requestsToImport.length === 0) {
      d.setErrorNotice('Please select at least one request to correlate.')
      return
    }
    const detected = detectCorrelations(requestsToImport)
    setCorrelationCandidates(detected)
    setIsCorrelationWizardOpen(true)
  }

  const handleApplyCorrelationsAndImport = (selectedCandidates: CorrelationCandidate[]) => {
    const requestsToImport = pickSelected(d.filteredRequests, d.selectedReqIds)
    const { nodes } = convertRecordedRequestsToNodes(requestsToImport, buildConversionOptions(d.options))
    const correlatedNodes = nodes.map((node) => applyCorrelationsToTree(node, selectedCandidates))

    d.onImport(correlatedNodes, d.options.targetContainerId)
    setIsCorrelationWizardOpen(false)
    d.onClose()
  }

  // Import selected requests into Test Plan
  const handleImportToTestPlan = () => {
    const requestsToImport = pickSelected(d.filteredRequests, d.selectedReqIds)
    if (requestsToImport.length === 0) {
      d.setErrorNotice('Please select at least one request to import.')
      return
    }

    const { nodes } = convertRecordedRequestsToNodes(requestsToImport, buildConversionOptions(d.options))
    if (nodes.length === 0) {
      d.setErrorNotice('No samplers could be generated.')
      return
    }

    d.onImport(nodes, d.options.targetContainerId)
    d.onClose()
  }

  return {
    isCorrelationWizardOpen,
    setIsCorrelationWizardOpen,
    correlationCandidates,
    handleOpenCorrelationWizard,
    handleApplyCorrelationsAndImport,
    handleImportToTestPlan,
  }
}
