import { useRef } from 'react'
import { localProjectService } from '../../services/projectService'
import { jmeterRunnerService } from '../../services/jmeterRunnerService'
import type { ActiveModal, AppStore, NotifyFn } from '../appTypes'
import { createRunStreamHandlers } from './runStreamHandlers'

interface RunControlDeps {
  store: AppStore
  dismissNoticeLater: NotifyFn
  selectResultsListener: () => void
  openModal: (modal: ActiveModal) => void
  setIsPromptBeforeRun: (value: boolean) => void
}

/** Start / stop handlers for real (JMeter CLI) and mock runs. */
export function useRunControl({ store, dismissNoticeLater, selectResultsListener, openModal, setIsPromptBeforeRun }: RunControlDeps) {
  const streamUnsubRef = useRef<(() => void) | null>(null)

  const executeRun = async () => {
    if (store.runState === 'RUNNING') return

    if (store.executionMode === 'real') {
      try {
        const xml = await localProjectService.exportJmx(store.testPlan)
        store.clearLogs()
        store.setConsoleOpen(true)
        store.startRun()
        selectResultsListener()

        if (streamUnsubRef.current) {
          streamUnsubRef.current()
        }

        const unsub = jmeterRunnerService.connectStream(createRunStreamHandlers(store, dismissNoticeLater))
        streamUnsubRef.current = unsub

        // SAFETY: remoteHosts is written only by the Test Plan editor as a comma-separated string
        const remoteHosts = store.testPlan.properties.remoteHosts as string | undefined
        const res = await jmeterRunnerService.startRun(xml, store.testPlan.name, { remoteHosts })
        if (!res.success) {
          throw new Error('Failed to start JMeter.')
        }
        store.startRunResults(res.runId)
        dismissNoticeLater('Started JMeter CLI execution in background...')
      } catch (err) {
        store.stopRun()
        const msg = err instanceof Error ? err.message : 'Could not launch JMeter CLI.'
        dismissNoticeLater(msg, 'error')
        if (msg.includes('not found') || msg.includes('Settings')) {
          store.setSettingsOpen(true)
        }
      }
    } else {
      store.startRun()
      selectResultsListener()
      dismissNoticeLater('Started mock simulation run.')
    }
  }

  const startTest = async () => {
    if (store.runState === 'RUNNING') return

    // If untitled / unsaved file, prompt to save before running (Standard JMeter behavior)
    if (!store.fileName) {
      setIsPromptBeforeRun(true)
      openModal('save')
      return
    }

    // Auto-save changes to current file before running if dirty
    if (store.dirty && store.fileName) {
      try {
        const xml = await localProjectService.exportJmx(store.testPlan)
        const blobUrl = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = store.fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(blobUrl)
        store.markSaved(store.fileName)
      } catch {
        // proceed
      }
    }

    await executeRun()
  }

  const stopTest = async () => {
    if (store.executionMode === 'real') {
      try {
        await jmeterRunnerService.stopRun()
      } catch {
        // ignore
      }
    }
    store.stopRun()
    if (streamUnsubRef.current) {
      streamUnsubRef.current()
      streamUnsubRef.current = null
    }
    dismissNoticeLater('Test execution stopped.')
  }

  return { executeRun, startTest, stopTest }
}
