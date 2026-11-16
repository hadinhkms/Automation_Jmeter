import { useMemo, useState } from 'react'
import { estimateSummary, pickSelected } from './recorderLogic'
import type { BrowserRecorderModalProps, InspectorTab, RecorderTab } from './recorderTypes'
import { useImportActions } from './useImportActions'
import { useImportOptions } from './useImportOptions'
import { useRecorderFilters } from './useRecorderFilters'
import { useRecorderSession } from './useRecorderSession'
import { useRecordingActions } from './useRecordingActions'
import { useSelectionActions } from './useSelectionActions'

/** Composes all Browser Recorder state, derived values and handlers for the modal. */
export function useBrowserRecorder(props: BrowserRecorderModalProps) {
  const { isOpen, targetNode, testPlanRoot, onClose, onImport } = props
  const [activeTab, setActiveTab] = useState<RecorderTab>('live')
  const [inspectedTab, setInspectedTab] = useState<InspectorTab>('body')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const options = useImportOptions(targetNode, testPlanRoot)
  const session = useRecorderSession(isOpen)
  const filters = useRecorderFilters(session.requests, session.selectedReqIds, session.inspectedReqId)
  const { filteredRequests } = filters
  const { selectedReqIds } = session
  const { createDefaults, groupByTx, createHeaderMgr, createCookieMgr, parameterizeSecrets } = options

  // Estimated nodes preview
  const estimatedSummary = useMemo(
    () => estimateSummary(pickSelected(filteredRequests, selectedReqIds), options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredRequests, selectedReqIds, createDefaults, groupByTx, createHeaderMgr, createCookieMgr, parameterizeSecrets]
  )

  const recording = useRecordingActions(session)
  const selection = useSelectionActions(session, filteredRequests)
  const importer = useImportActions({
    filteredRequests,
    selectedReqIds,
    options,
    setErrorNotice: session.setErrorNotice,
    onImport,
    onClose,
  })

  // Copy helper
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    }).catch(() => {})
  }

  return {
    ...session,
    ...filters,
    ...options,
    ...recording,
    ...selection,
    ...importer,
    activeTab,
    setActiveTab,
    inspectedTab,
    setInspectedTab,
    copiedKey,
    handleCopyText,
    estimatedSummary,
    onClose,
  }
}

export type RecorderModel = ReturnType<typeof useBrowserRecorder>
