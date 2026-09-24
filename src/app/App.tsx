// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertCircle, BarChart3, PanelLeftOpen, UploadCloud, X, Square } from 'lucide-react'
import { ContextMenu, type ContextMenuState } from '../components/context-menu/ContextMenu'
import { StatusBar } from '../components/layout/StatusBar'
import { MenuBar, type AppCommands } from '../components/menu/MenuBar'
import { Toolbar } from '../components/toolbar/Toolbar'
import { TestPlanTree } from '../components/tree/TestPlanTree'
import { ComponentEditorRouter } from '../editors/ComponentEditorRouter'
import { canAddChild } from '../rules/componentRules'
import { localProjectService } from '../services/projectService'
import { jmeterRunnerService } from '../services/jmeterRunnerService'
import { useJMeterStore } from '../store/jmeterStore'
import { findNode } from '../utils/treeUtils'
import type { JMeterComponentType, TestPlanNode } from '../models/jmeter'
import { ConsoleLogDrawer } from '../components/layout/ConsoleLogDrawer'
import { JMeterSettingsModal } from '../components/common/JMeterSettingsModal'
import { ImportCurlModal } from '../components/common/ImportCurlModal'
import { BrowserRecorderModal } from '../components/common/BrowserRecorderModal'
import { PluginsManagerModal } from '../components/common/PluginsManagerModal'
import { SaveTestPlanModal } from '../components/common/SaveTestPlanModal'
import { AssetManagerModal } from '../components/common/AssetManagerModal'
import { TemplateGalleryModal } from '../components/common/TemplateGalleryModal'
import { WorkloadGraphModal } from '../components/common/WorkloadGraphModal'
import { SlaSettingsModal } from '../components/common/SlaSettingsModal'
import { GitManagerModal } from '../components/common/GitManagerModal'
import { evaluateSamplesSla } from '../utils/slaEvaluator'
import type { SlaThresholds, WebhookConfig } from '../models/jmeter'
import { parseJtlContent } from '../utils/jtlParser'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}

function findNodePathByType(node: TestPlanNode, type: JMeterComponentType, path: string[] = []): string[] | null {
  const nextPath = [...path, node.id]
  if (node.type === type) return nextPath

  for (const child of node.children) {
    const found = findNodePathByType(child, type, nextPath)
    if (found) return found
  }

  return null
}

export type ActiveModal =
  | 'templates'
  | 'workload'
  | 'sla'
  | 'git'
  | 'assets'
  | 'recorder'
  | 'curl'
  | 'plugins'
  | 'settings'
  | 'save'
  | null

export function App() {
  const store = useJMeterStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamUnsubRef = useRef<(() => void) | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [treeVisible, setTreeVisible] = useState(true)
  const [notice, setNotice] = useState<{ type: 'error' | 'info'; message: string } | null>(null)
  const [globalDragOver, setGlobalDragOver] = useState(false)
  const [dragFileType, setDragFileType] = useState<'jmx' | 'jtl' | 'other'>('jmx')
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [isPromptBeforeRun, setIsPromptBeforeRun] = useState(false)

  const openModal = (modal: ActiveModal) => {
    setActiveModal(modal)
    store.setSettingsOpen(modal === 'settings')
  }

  const closeModal = () => {
    setActiveModal(null)
    store.setSettingsOpen(false)
  }

  const toggleModal = (modal: ActiveModal) => {
    if (activeModal === modal) {
      closeModal()
    } else {
      openModal(modal)
    }
  }

  useEffect(() => {
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal) {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleGlobalEsc)
    return () => window.removeEventListener('keydown', handleGlobalEsc)
  }, [activeModal])

  // Resizable sidebar width with persistence
  const [treeWidth, setTreeWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('jmeter_tree_width')
      if (saved) {
        const val = Number(saved)
        if (Number.isFinite(val) && val >= 220 && val <= 1400) return val
      }
    } catch {
      return 360
    }
    return 360
  })
  const [isResizingTree, setIsResizingTree] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('jmeter_tree_width', String(treeWidth))
    } catch {
      // Ignore storage write error
    }
  }, [treeWidth])

  const handleTreeResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingTree(true)
    const startX = e.clientX
    const startWidth = treeWidth

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const nextWidth = Math.max(220, Math.min(window.innerWidth - 300, startWidth + delta))
      setTreeWidth(nextWidth)
    }

    const onMouseUp = () => {
      setIsResizingTree(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }



  const selectedNode = findNode(store.testPlan, store.selectedNodeId) ?? store.testPlan
  const menuNode = contextMenu ? findNode(store.testPlan, contextMenu.nodeId) : null
  const canPaste = Boolean(
    store.clipboard && canAddChild(selectedNode.type, store.clipboard.node.type),
  )

  const dismissNoticeLater = (message: string, type: 'error' | 'info' = 'info') => {
    setNotice({ message, type })
  }

  const selectResultsListener = () => {
    const resultsPath = findNodePathByType(store.testPlan, 'ViewResultsTree')
    if (!resultsPath) return

    store.expandNodes(resultsPath.slice(0, -1))
    store.selectNode(resultsPath[resultsPath.length - 1])
  }

  // Initial detection of JMeter & previous run results
  useEffect(() => {
    jmeterRunnerService.detectJMeter().then((res) => {
      store.setJMeterConfig({
        path: res.path || '',
        found: res.found,
        version: res.version,
      })
    }).catch(() => {})

    // Sync runner status on mount
    jmeterRunnerService.getStatus().then((st) => {
      if (st && st.isRunning) {
        store.startRun()
        if (st.currentRunId) {
          store.startRunResults(st.currentRunId)
        }
        selectResultsListener()
      }
    }).catch(() => {})

    // Load previous run results if available
    jmeterRunnerService.getResults().then((results) => {
      if (results && results.samples && results.samples.length > 0) {
        store.setRunResults({
          samples: results.samples,
          summaryRows: results.summaryRows,
          aggregateRows: results.aggregateRows,
          hasReport: results.hasReport,
          runId: results.runId,
        })
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const newPlan = () => {
    if (store.dirty && !window.confirm('Discard unsaved changes and create a new test plan?')) return
    store.newTestPlan()
    dismissNoticeLater('New test plan created.')
  }

  const exportJmx = async () => {
    try {
      const xml = await localProjectService.exportJmx(store.testPlan)
      const blobUrl = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
      const link = document.createElement('a')
      link.href = blobUrl
      const defaultName = store.fileName || `${store.testPlan.name.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Test_Plan'}.jmx`
      link.download = defaultName.endsWith('.jmx') ? defaultName : `${defaultName}.jmx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
      store.markSaved(link.download)
      dismissNoticeLater(`Saved and exported ${link.download} successfully.`)
    } catch (error) {
      dismissNoticeLater(error instanceof Error ? error.message : 'Could not export JMX.', 'error')
    }
  }

  const removeSelected = () => {
    if (selectedNode.id === store.testPlan.id) return
    if (selectedNode.children.length > 0 && !window.confirm(`Remove “${selectedNode.name}” and all of its children?`)) return
    store.deleteNode(selectedNode.id)
  }

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

        const unsub = jmeterRunnerService.connectStream({
          onStart: (data) => {
            if (data.runId) {
              store.startRunResults(data.runId)
            }
          },
          onLog: (line, type) => {
            store.addLog(line, type)
          },
          onProgress: (metrics) => {
            store.updateProgressMetrics({
              samples: metrics.samples,
              errors: metrics.errors,
              throughput: metrics.throughput,
              activeThreads: metrics.activeThreads,
              durationSeconds: metrics.durationSeconds,
            })
          },
          onSamples: (update) => {
            store.appendRunSamples({
              runId: update.runId,
              samples: update.samples,
              summaryRows: update.summaryRows,
              aggregateRows: update.aggregateRows,
              totalSamples: update.totalSamples,
              totalErrors: update.totalErrors,
              hasReport: update.hasReport,
            })
          },
          onComplete: async (summary) => {
            let finalResults = summary
            try {
              const fresh = await jmeterRunnerService.getResults(summary.runId)
              if (fresh && fresh.samples && fresh.samples.length > 0) {
                finalResults = fresh
              }
            } catch {
              // fallback
            }

            store.setRunResults({
              samples: finalResults.samples,
              summaryRows: finalResults.summaryRows,
              aggregateRows: finalResults.aggregateRows,
              hasReport: finalResults.hasReport,
              runId: finalResults.runId,
            })
            store.stopRun()
            const slaThresholds = store.testPlan.properties.slaThresholds as SlaThresholds | undefined
            if (slaThresholds && slaThresholds.enabled && finalResults.samples && finalResults.samples.length > 0) {
              const slaRes = evaluateSamplesSla(slaThresholds, finalResults.samples, finalResults.summaryRows)
              if (!slaRes.passed) {
                const failedText = slaRes.rules.filter(r => !r.passed).map(r => `${r.name} (${r.actual}${r.unit} > ${r.target}${r.unit})`).join(', ')
                dismissNoticeLater(`⚠️ Quality Gate Failed: ${failedText}`, 'error')
              } else {
                dismissNoticeLater('✅ All SLA Quality Gate thresholds passed successfully!', 'info')
              }
            } else {
              dismissNoticeLater(
                finalResults.status === 'completed'
                  ? `JMeter finished (${finalResults.totalSamples} samples loaded, ${finalResults.errorRate.toFixed(2)}% errors).`
                  : `JMeter run ended (${finalResults.totalSamples} samples, exit code ${finalResults.exitCode}).`,
                'info',
              )
            }
          },

          onStopped: () => {
            store.stopRun()
            dismissNoticeLater('JMeter run was stopped.')
          },
          onError: (err) => {
            store.stopRun()
            dismissNoticeLater(err, 'error')
          },
        })
        streamUnsubRef.current = unsub

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

  const openHtmlReport = () => {
    if (store.activeRunId) {
      window.open(jmeterRunnerService.getReportUrl(store.activeRunId), '_blank')
    } else {
      dismissNoticeLater('No HTML report available. Run a test first.', 'error')
    }
  }

  const savePlan = async () => {
    if (!store.fileName) {
      setIsPromptBeforeRun(false)
      openModal('save')
      return
    }
    await exportJmx()
  }

  const saveAsPlan = () => {
    setIsPromptBeforeRun(false)
    openModal('save')
  }

  const commands = useMemo<AppCommands>(() => ({
    newPlan,
    openJmx: () => fileInputRef.current?.click(),
    save: savePlan,
    saveAs: saveAsPlan,
    exportJmx,
    cut: () => store.cutNode(selectedNode.id),
    copy: () => store.copyNode(selectedNode.id),
    paste: () => store.pasteNode(selectedNode.id),
    duplicate: () => store.duplicateNode(selectedNode.id),
    remove: removeSelected,
    start: startTest,
    stop: stopTest,
    shutdown: stopTest,
    clear: store.clearResults,
    toggleConsole: () => store.setConsoleOpen(!store.isConsoleOpen),
    openSettings: () => toggleModal('settings'),
    openHtmlReport,
    importCurl: () => toggleModal('curl'),
    openBrowserRecorder: () => toggleModal('recorder'),
    openPluginsManager: () => toggleModal('plugins'),
    openAssetManager: () => toggleModal('assets'),
    openTemplateGallery: () => toggleModal('templates'),
    openWorkloadGraph: () => toggleModal('workload'),
    openSlaSettings: () => toggleModal('sla'),
    openGitManager: () => toggleModal('git'),
    openUserGuide: () => window.open('/docs/index.html', '_blank'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [selectedNode.id, store.dirty, store.fileName, store.testPlan, store.executionMode, store.activeRunId, store.isConsoleOpen, activeModal])

  const disabled: Partial<Record<keyof AppCommands, boolean>> = {
    save: !store.dirty && Boolean(store.fileName),
    cut: selectedNode.id === store.testPlan.id,
    paste: !canPaste,
    duplicate: selectedNode.id === store.testPlan.id,
    remove: selectedNode.id === store.testPlan.id,
    start: store.runState === 'RUNNING',
    stop: false,
    shutdown: false,
    clear: store.metrics.samples === 0 && store.runState !== 'RUNNING',
  }

  // Mock runner tick interval (only when in mock mode)
  useEffect(() => {
    if (store.runState !== 'RUNNING' || store.executionMode !== 'mock') return
    const interval = window.setInterval(store.tickRun, 1000)
    return () => window.clearInterval(interval)
  }, [store.runState, store.executionMode, store.tickRun])


  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
        setRenameId(null)
        return
      }
      if (isEditableTarget(event.target)) return
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        commands.saveAs()
      } else if (modifier && event.shiftKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        commands.openBrowserRecorder()
      } else if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault()
        commands.save()
      } else if (modifier && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        commands.newPlan()
      } else if (modifier && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        commands.openJmx()
      } else if (modifier && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        if (store.runState !== 'RUNNING') commands.start()
      } else if (modifier && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        commands.copy()
      } else if (modifier && event.key.toLowerCase() === 'x') {
        event.preventDefault()
        commands.cut()
      } else if (modifier && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        commands.paste()
      } else if (modifier && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        commands.duplicate()
      } else if (event.key === 'Delete') {
        event.preventDefault()
        commands.remove()
      } else if (event.key === 'F2') {
        event.preventDefault()
        setRenameId(store.selectedNodeId)
      }
    }
    window.addEventListener('click', closeMenu)
    window.addEventListener('blur', closeMenu)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('blur', closeMenu)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [commands, store.runState, store.selectedNodeId])

  useEffect(() => {
    const title = store.fileName
      ? `${store.fileName}${store.dirty ? ' *' : ''} - JMeter Web UI`
      : `${store.testPlan.name}${store.dirty ? ' *' : ''} - JMeter Web UI`
    document.title = title
  }, [store.fileName, store.testPlan.name, store.dirty])

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

  const liveErrorRate = store.metrics.samples > 0
    ? (store.metrics.errors / store.metrics.samples) * 100
    : 0
  const liveMinutes = Math.floor(store.metrics.durationSeconds / 60)
  const liveSeconds = String(store.metrics.durationSeconds % 60).padStart(2, '0')

  return (
    <div
      className={`app-shell ${globalDragOver ? 'global-drag-active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setGlobalDragOver(true)
        const types = Array.from(e.dataTransfer.items || [])
        const isJtl = types.some((t) => t.type === 'text/csv' || t.kind === 'file')
        setDragFileType(isJtl ? 'jtl' : 'jmx')
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setGlobalDragOver(false)
        }
      }}
      onDrop={handleGlobalDrop}
    >
      {/* Global Drag & Drop Overlay */}
      {globalDragOver ? (
        <div className="global-dropzone-modal">
          <div className="global-dropzone-box">
            <UploadCloud size={56} className="global-drop-icon" />
            <h2>Drop file to import into JMeter Web UI</h2>
            <p>
              {dragFileType === 'jtl'
                ? 'Drop .jtl / .csv to load and view test results in View Results Tree'
                : 'Drop .jmx file to load and edit Test Plan, or .jtl / .csv to view results'}
            </p>
            <div className="dropzone-supported-tags">
              <span className="drop-tag">.JMX Test Plan</span>
              <span className="drop-tag">.JTL Results</span>
              <span className="drop-tag">.CSV Data / Results</span>
              <span className="drop-tag">.XML</span>
            </div>
          </div>
        </div>
      ) : null}

      <MenuBar commands={commands} disabled={disabled} fileName={store.fileName} dirty={store.dirty} />
      <Toolbar commands={commands} disabled={disabled} activeModal={activeModal} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".jmx,.xml,application/xml,text/xml"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          if (store.dirty && !window.confirm('Discard unsaved changes and open this JMX file?')) return
          try {
            const testPlan = await localProjectService.openJmx(file)
            store.replaceTestPlan(testPlan, file.name)
            dismissNoticeLater(`Opened ${file.name}`)
          } catch (error) {
            dismissNoticeLater(error instanceof Error ? error.message : 'Could not open this JMX file.', 'error')
          }
        }}
      />
      {notice ? (
        <div className={`notice-banner ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <div className="notice-banner-text">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{notice.message}</span>
          </div>
          {notice.message.includes('already running') || notice.message.includes('is running') || store.runState === 'RUNNING' ? (
            <button
              type="button"
              className="notice-action-btn btn-force-stop"
              onClick={async () => {
                await stopTest()
                dismissNoticeLater('Runner reset and background processes stopped successfully.', 'info')
              }}
            >
              <Square size={12} fill="currentColor" />
              Force Stop & Reset
            </button>
          ) : null}
          <button
            type="button"
            className="notice-close-btn"
            aria-label="Dismiss notification"
            title="Dismiss"
            onClick={() => setNotice(null)}
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {store.runState === 'RUNNING' ? (
        <div className="live-progress-banner" role="status" aria-live="polite">
          <div className="live-progress-title">
            <Activity size={15} />
            <span>JMeter running</span>
          </div>
          <div className="live-progress-metrics">
            <span><BarChart3 size={13} /> {store.metrics.samples.toLocaleString()} samples</span>
            <span>{store.metrics.throughput.toFixed(1)} req/s</span>
            <span>{store.metrics.errors.toLocaleString()} errors</span>
            <span>{liveErrorRate.toFixed(2)}% error rate</span>
            <span>{liveMinutes}:{liveSeconds}</span>
          </div>
        </div>
      ) : null}

      <main
        className={`workspace ${treeVisible ? '' : 'tree-collapsed'} ${isResizingTree ? 'resizing-tree' : ''}`}
        style={treeVisible ? { gridTemplateColumns: `${treeWidth}px 5px minmax(0, 1fr)` } : undefined}
      >
        {treeVisible ? (
          <>
            <TestPlanTree
              root={store.testPlan}
              selectedId={store.selectedNodeId}
              expandedIds={store.expandedNodeIds}
              renameId={renameId}
              fileName={store.fileName}
              dirty={store.dirty}
              onSelect={store.selectNode}
              onToggle={store.toggleExpanded}
              onContextMenu={(event, nodeId) => {
                event.preventDefault()
                event.stopPropagation()
                store.selectNode(nodeId)
                const x = Math.min(event.clientX, window.innerWidth - 430)
                const y = Math.min(event.clientY, window.innerHeight - 390)
                setContextMenu({ x: Math.max(4, x), y: Math.max(4, y), nodeId })
              }}
              onRename={store.renameNode}
              onBeginRename={setRenameId}
              onRenameEnd={() => setRenameId(null)}
              onAddClick={(event) => {
                event.stopPropagation()
                const rect = event.currentTarget.getBoundingClientRect()
                setContextMenu({ x: rect.left, y: rect.bottom + 4, nodeId: selectedNode.id, addOnly: true })
              }}
              onCollapsePanel={() => setTreeVisible(false)}
              onMoveNode={store.moveNode}
            />
            <div
              className={`workspace-resizer ${isResizingTree ? 'is-dragging' : ''}`}
              onMouseDown={handleTreeResizeStart}
              onDoubleClick={() => setTreeWidth(360)}
              title="Kéo sang trái/phải để chỉnh độ rộng thanh Test Plan (Nháy đúp để reset về 360px)"
            />
          </>
        ) : (
          <button type="button" className="restore-tree-button" title="Show test plan tree" aria-label="Show test plan tree" onClick={() => setTreeVisible(true)}>
            <PanelLeftOpen size={17} />
          </button>
        )}

        <ComponentEditorRouter
          node={selectedNode}
          updateNode={(updates) => store.updateNode(selectedNode.id, updates)}
          updateProperties={(updates) => store.updateNodeProperties(selectedNode.id, updates)}
          resultsCleared={store.resultsCleared}
        />
      </main>

      <StatusBar state={store.runState} metrics={store.metrics} dirty={store.dirty} fileName={store.fileName} />

      {contextMenu && menuNode ? (
        <ContextMenu
          menu={contextMenu}
          root={store.testPlan}
          node={menuNode}
          hasClipboard={Boolean(store.clipboard)}
          clipboardType={store.clipboard?.node.type}
          onClose={() => setContextMenu(null)}
          onAdd={(type) => store.addNode(menuNode.id, type)}
          onImportCurl={() => toggleModal('curl')}
          onOpenRecorder={() => toggleModal('recorder')}
          onCut={() => store.cutNode(menuNode.id)}
          onCopy={() => store.copyNode(menuNode.id)}
          onPaste={() => store.pasteNode(menuNode.id)}
          onDuplicate={() => store.duplicateNode(menuNode.id)}
          onDelete={() => {
            if (menuNode.id === store.testPlan.id) return
            if (menuNode.children.length === 0 || window.confirm(`Remove “${menuNode.name}” and all of its children?`)) store.deleteNode(menuNode.id)
          }}
          onToggleEnabled={() => store.toggleEnabled(menuNode.id)}
          onRename={() => setRenameId(menuNode.id)}
          onMoveToTop={() => store.moveNodeToTop(menuNode.id)}
          onMoveUp={() => store.moveNodeUp(menuNode.id)}
          onMoveDown={() => store.moveNodeDown(menuNode.id)}
          onMoveToBottom={() => store.moveNodeToBottom(menuNode.id)}
        />
      ) : null}

      <ConsoleLogDrawer />
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
      <WorkloadGraphModal
        isOpen={activeModal === 'workload'}
        onClose={closeModal}
        testPlan={store.testPlan}
      />
      <SlaSettingsModal
        isOpen={activeModal === 'sla'}
        onClose={closeModal}
        thresholds={store.testPlan.properties.slaThresholds as SlaThresholds | undefined}
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
    </div>
  )
}
