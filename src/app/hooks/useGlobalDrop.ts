import { useState } from 'react'
import { localProjectService } from '../../services/projectService'
import { parseJtlContent } from '../../utils/jtlParser'
import type { AppStore, NotifyFn } from '../appTypes'

/** Window-wide drag & drop import of .jmx/.xml test plans and .jtl/.csv result files. */
export function useGlobalDrop(store: AppStore, dismissNoticeLater: NotifyFn) {
  const [globalDragOver, setGlobalDragOver] = useState(false)
  const [dragFileType, setDragFileType] = useState<'jmx' | 'jtl' | 'other'>('jmx')

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setGlobalDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const lower = file.name.toLowerCase()
    if (lower.endsWith('.jmx') || lower.endsWith('.xml')) {
      if (store.dirty && !window.confirm('Discard unsaved changes and open this JMX file?')) return
      try {
        const testPlan = await localProjectService.openJmx(file)
        store.replaceTestPlan(testPlan, file.name)
        dismissNoticeLater(`Opened test plan: ${file.name}`)
      } catch (error) {
        dismissNoticeLater(error instanceof Error ? error.message : 'Could not open this JMX file.', 'error')
      }
    } else if (lower.endsWith('.jtl') || lower.endsWith('.csv')) {
      try {
        const text = await file.text()
        const parsed = parseJtlContent(text)
        if (parsed.samples.length > 0) {
          store.setRunResults({
            samples: parsed.samples,
            summaryRows: parsed.summaryRows,
            aggregateRows: parsed.aggregateRows,
            hasReport: false,
            runId: file.name.replace(/\.[^.]+$/, ''),
          })
          dismissNoticeLater(`Imported ${parsed.totalSamples} test samples from ${file.name}`)
        } else {
          dismissNoticeLater(`No valid test results found in ${file.name}`, 'error')
        }
      } catch (error) {
        dismissNoticeLater(error instanceof Error ? error.message : 'Could not parse result file.', 'error')
      }
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setGlobalDragOver(true)
    const types = Array.from(e.dataTransfer.items || [])
    const isJtl = types.some((t) => t.type === 'text/csv' || t.kind === 'file')
    setDragFileType(isJtl ? 'jtl' : 'jmx')
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // SAFETY: DOM event targets are Nodes (or null, which contains() treats as false)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setGlobalDragOver(false)
    }
  }

  return { globalDragOver, dragFileType, dropHandlers: { onDragOver, onDragLeave, onDrop: handleGlobalDrop } }
}
