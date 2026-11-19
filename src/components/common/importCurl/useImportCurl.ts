import { useState, useMemo, useEffect } from 'react'
import { parseCurlCommand, convertCurlToNodes, type ParsedCurl } from '../../../utils/curlParser'
import type { TestPlanNode } from '../../../models/jmeter'
import { SAMPLE_CURL } from './constants'

/** State, live parsing and import handlers for ImportCurlModal. */
export function useImportCurl(
  isOpen: boolean,
  targetNode: TestPlanNode,
  onClose: () => void,
  onImport: (samplerNode: TestPlanNode, targetParentId?: string) => void,
) {
  const [curlInput, setCurlInput] = useState('')
  const [samplerName, setSamplerName] = useState('')
  const [createHeaderManager, setCreateHeaderManager] = useState(true)
  const [createCookieManager, setCreateCookieManager] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const parsed: ParsedCurl | null = useMemo(() => {
    if (!curlInput.trim()) return null
    try {
      return parseCurlCommand(curlInput)
    } catch {
      return null
    }
  }, [curlInput])

  useEffect(() => {
    if (parsed) {
      setSamplerName(parsed.suggestedName)
      setErrorMsg('')
    } else {
      setSamplerName('')
    }
  }, [parsed])

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
    }
  }, [isOpen])

  const handleImport = () => {
    if (!parsed || !parsed.url) {
      setErrorMsg('Please enter a valid cURL command with a target URL.')
      return
    }

    try {
      const { samplerNode } = convertCurlToNodes(
        parsed,
        samplerName,
        createHeaderManager,
        createCookieManager,
      )
      onImport(samplerNode, targetNode.id)
      onClose()
      setCurlInput('')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to import cURL command.')
    }
  }

  const handlePasteSample = () => {
    setCurlInput(SAMPLE_CURL)
  }

  return {
    curlInput,
    setCurlInput,
    samplerName,
    setSamplerName,
    createHeaderManager,
    setCreateHeaderManager,
    createCookieManager,
    setCreateCookieManager,
    errorMsg,
    parsed,
    handleImport,
    handlePasteSample,
  }
}
