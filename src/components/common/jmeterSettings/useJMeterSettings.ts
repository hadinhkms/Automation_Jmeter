import { useState, useEffect } from 'react'
import { jmeterRunnerService, type JMeterDetectionResult } from '../../../services/jmeterRunnerService'
import { useJMeterStore } from '../../../store/jmeterStore'

/** Path/mode state, auto-detect, test and save handlers for JMeterSettingsModal. */
export function useJMeterSettings(isOpen?: boolean, onClose?: () => void) {
  const store = useJMeterStore()
  const [pathInput, setPathInput] = useState(store.jmeterConfig.path || '')
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<JMeterDetectionResult | null>(null)
  const [mode, setMode] = useState<'real' | 'mock'>(store.executionMode)

  const isModalOpen = isOpen !== undefined ? isOpen : store.isSettingsOpen

  const handleClose = () => {
    if (onClose) onClose()
    store.setSettingsOpen(false)
  }

  useEffect(() => {
    setPathInput(store.jmeterConfig.path || '')
    setMode(store.executionMode)
    if (!store.jmeterConfig.version) {
      handleDetect()
    } else {
      setTestResult({
        found: store.jmeterConfig.found,
        path: store.jmeterConfig.path,
        version: store.jmeterConfig.version,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDetect = async () => {
    setLoading(true)
    try {
      const res = await jmeterRunnerService.detectJMeter()
      setTestResult(res)
      if (res.found && res.path) {
        setPathInput(res.path)
        store.setJMeterConfig({ path: res.path, found: res.found, version: res.version })
      }
    } catch {
      setTestResult({
        found: false,
        path: null,
        version: null,
        error: 'Failed to detect JMeter installation.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestPath = async () => {
    setLoading(true)
    try {
      const res = await jmeterRunnerService.saveConfig(pathInput.trim())
      setTestResult(res.detection)
      store.setJMeterConfig({
        path: res.detection.path || pathInput.trim(),
        found: res.detection.found,
        version: res.detection.version,
      })
    } catch (err) {
      setTestResult({
        found: false,
        path: null,
        version: null,
        error: err instanceof Error ? err.message : 'Failed to test path.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    await handleTestPath()
    store.setExecutionMode(mode)
    handleClose()
  }

  return {
    store,
    pathInput,
    setPathInput,
    loading,
    testResult,
    mode,
    setMode,
    isModalOpen,
    handleClose,
    handleDetect,
    handleTestPath,
    handleSave,
  }
}
