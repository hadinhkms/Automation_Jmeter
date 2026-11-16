import { useEffect, useMemo, useState } from 'react'
import type { TestPlanNode } from '../../models/jmeter'
import { collectContainers } from './recorderLogic'

/** Destination container + JMeter conversion options for the recorder import. */
export function useImportOptions(targetNode: TestPlanNode, testPlanRoot: TestPlanNode) {
  const [targetContainerId, setTargetContainerId] = useState<string>(targetNode.id)
  const [groupByTx, setGroupByTx] = useState(true)
  const [createHeaderMgr, setCreateHeaderMgr] = useState(true)
  const [createCookieMgr, setCreateCookieMgr] = useState(true)
  const [createDefaults, setCreateDefaults] = useState(false)
  const [cleanHeaders, setCleanHeaders] = useState(true)
  const [maskSensitive, setMaskSensitive] = useState(false)
  const [parameterizeSecrets, setParameterizeSecrets] = useState(false)

  // Containers list for destination selector
  const containers = useMemo(() => collectContainers(testPlanRoot), [testPlanRoot])

  // Sync selected destination when targetNode changes
  useEffect(() => {
    if (targetNode) {
      setTargetContainerId(targetNode.id)
    }
  }, [targetNode])

  return {
    containers,
    targetContainerId,
    setTargetContainerId,
    groupByTx,
    setGroupByTx,
    createHeaderMgr,
    setCreateHeaderMgr,
    createCookieMgr,
    setCreateCookieMgr,
    createDefaults,
    setCreateDefaults,
    cleanHeaders,
    setCleanHeaders,
    maskSensitive,
    setMaskSensitive,
    parameterizeSecrets,
    setParameterizeSecrets,
  }
}

export type ImportOptionsModel = ReturnType<typeof useImportOptions>
