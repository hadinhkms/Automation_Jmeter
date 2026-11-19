import { useState, useEffect, useMemo } from 'react'
import { useJMeterStore } from '../../../store/jmeterStore'
import { localProjectService } from '../../../services/projectService'

/** File-name state, reset-on-open and export/download handler for SaveTestPlanModal. */
export function useSaveTestPlan(isOpen: boolean, onClose: () => void, onSavedAndRun?: () => void) {
  const store = useJMeterStore()
  const defaultName = useMemo(() => {
    if (store.fileName) return store.fileName
    const cleanRootName = store.testPlan.name
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
    return `${cleanRootName || 'Test_Plan'}.jmx`
  }, [store.fileName, store.testPlan.name])

  const [fileNameInput, setFileNameInput] = useState(defaultName)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFileNameInput(defaultName)
      setErrorMsg('')
      setIsSaving(false)
    }
  }, [isOpen, defaultName])

  const handleSave = async (andRun = false) => {
    const trimmed = fileNameInput.trim()
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập tên file (.jmx)')
      return
    }

    const finalName = trimmed.endsWith('.jmx') ? trimmed : `${trimmed}.jmx`

    try {
      setIsSaving(true)
      // Export and download JMX
      const xml = await localProjectService.exportJmx(store.testPlan)
      const blobUrl = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = finalName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)

      // Update store
      store.markSaved(finalName)
      setIsSaving(false)
      onClose()

      if (andRun && onSavedAndRun) {
        onSavedAndRun()
      }
    } catch (err) {
      setIsSaving(false)
      setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu file JMX')
    }
  }

  return { store, fileNameInput, setFileNameInput, errorMsg, setErrorMsg, isSaving, handleSave }
}
