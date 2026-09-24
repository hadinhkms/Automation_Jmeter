// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Radio,
  X,
  Play,
  Square,
  Trash2,
  UploadCloud,
  Layers,
  Search,
  CheckSquare,
  Square as SquareEmpty,
  FolderPlus,
  Compass,
  AlertCircle,
  ChevronRight,
  Globe,
  Sparkles,
  ShieldAlert,
  Key,
  Copy,
  Check,
  FolderTree,
  Edit3,
  Link2,
} from 'lucide-react'
import type { RecordedRequest, BrowserDetection, RecordedHeader, RecordedParam } from '../../models/recorder'
import { browserRecorderService, type RecorderStatus } from '../../services/browserRecorderService'
import { parseHarContent } from '../../utils/harParser'
import {
  convertRecordedRequestsToNodes,
  isStaticUrl,
  isAnalyticsUrl,
  type ConversionOptions,
} from '../../utils/recordedRequestConverter'
import type { TestPlanNode } from '../../models/jmeter'
import { detectCorrelations, applyCorrelationsToTree, type CorrelationCandidate } from '../../utils/correlationDetector'
import { CorrelationWizardModal } from './CorrelationWizardModal'

interface BrowserRecorderModalProps {
  isOpen: boolean
  targetNode: TestPlanNode
  testPlanRoot: TestPlanNode
  onClose: () => void
  onImport: (nodes: TestPlanNode[], targetParentId: string) => void
}

function collectContainers(node: TestPlanNode, depth = 0): Array<{ id: string; name: string; type: string; depth: number }> {
  const result: Array<{ id: string; name: string; type: string; depth: number }> = []
  if (['TestPlan', 'ThreadGroup', 'TransactionController', 'LoopController', 'IfController', 'TestFragmentController'].includes(node.type)) {
    result.push({ id: node.id, name: node.name, type: node.type, depth })
  }
  for (const child of node.children) {
    result.push(...collectContainers(child, depth + 1))
  }
  return result
}

export function BrowserRecorderModal({
  isOpen,
  targetNode,
  testPlanRoot,
  onClose,
  onImport,
}: BrowserRecorderModalProps) {
  const [activeTab, setActiveTab] = useState<'live' | 'har'>('live')
  const [availableBrowsers, setAvailableBrowsers] = useState<BrowserDetection>({ available: [] })
  const [selectedBrowser, setSelectedBrowser] = useState<'chrome' | 'edge' | 'custom'>('chrome')
  const [targetUrl, setTargetUrl] = useState('https://')
  const [currentTransaction, setCurrentTransaction] = useState('01_Open_Application')
  const [nextTransactionInput, setNextTransactionInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [requests, setRequests] = useState<RecordedRequest[]>([])
  const [selectedReqIds, setSelectedReqIds] = useState<Set<string>>(new Set())
  const [inspectedReqId, setInspectedReqId] = useState<string | null>(null)
  const [inspectedTab, setInspectedTab] = useState<'body' | 'headers' | 'query' | 'response' | 'sensitive'>('body')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Filter states
  const [searchText, setSearchText] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'XHR' | 'DOC' | 'STATIC' | 'FAILED'>('ALL')
  const [hideStatic, setHideStatic] = useState(true)
  const [hideAnalytics, setHideAnalytics] = useState(true)

  // Conversion / Import options
  const [targetContainerId, setTargetContainerId] = useState<string>(targetNode.id)
  const [groupByTx, setGroupByTx] = useState(true)
  const [isCorrelationWizardOpen, setIsCorrelationWizardOpen] = useState(false)
  const [correlationCandidates, setCorrelationCandidates] = useState<CorrelationCandidate[]>([])
  const [createHeaderMgr, setCreateHeaderMgr] = useState(true)
  const [createCookieMgr, setCreateCookieMgr] = useState(true)
  const [createDefaults, setCreateDefaults] = useState(false)
  const [cleanHeaders, setCleanHeaders] = useState(true)
  const [maskSensitive, setMaskSensitive] = useState(false)
  const [parameterizeSecrets, setParameterizeSecrets] = useState(false)
  const [autoPageSplit, setAutoPageSplit] = useState(true)
  const [batchStepInput, setBatchStepInput] = useState('')

  const [harFileName, setHarFileName] = useState<string | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const streamUnsubRef = useRef<(() => void) | null>(null)
  const harFileInputRef = useRef<HTMLInputElement>(null)

  // Containers list for destination selector
  const containers = useMemo(() => collectContainers(testPlanRoot), [testPlanRoot])

  // Sync selected destination when targetNode changes
  useEffect(() => {
    if (targetNode) {
      setTargetContainerId(targetNode.id)
    }
  }, [targetNode])

  // Fetch available browsers and status on modal open
  useEffect(() => {
    if (!isOpen) return

    browserRecorderService.getAvailableBrowsers()
      .then((res) => {
        setAvailableBrowsers(res)
        if (res.chrome) setSelectedBrowser('chrome')
        else if (res.edge) setSelectedBrowser('edge')
        else if (res.available.length > 0) setSelectedBrowser(res.available[0].type)
      })
      .catch(() => {})

    browserRecorderService.getStatus()
      .then((st: RecorderStatus) => {
        setIsRecording(st.isRecording)
        if (st.currentTransaction) setCurrentTransaction(st.currentTransaction)
        if (st.requests && st.requests.length > 0) {
          setRequests(st.requests)
          setSelectedReqIds(new Set(st.requests.map((r) => r.id)))
        }
      })
      .catch(() => {})
  }, [isOpen])

  // Listen to live stream events
  useEffect(() => {
    if (!isOpen) {
      if (streamUnsubRef.current) {
        streamUnsubRef.current()
        streamUnsubRef.current = null
      }
      return
    }

    const unsub = browserRecorderService.connectStream({
      onConnected: (data) => {
        setIsRecording(data.status.isRecording)
        if (data.status.currentTransaction) setCurrentTransaction(data.status.currentTransaction)
        if (data.status.requests) {
          setRequests(data.status.requests)
          setSelectedReqIds(new Set(data.status.requests.map((r) => r.id)))
        }
      },
      onStarted: (data) => {
        setIsRecording(true)
        if (data.transaction) setCurrentTransaction(data.transaction)
        setIsStarting(false)
        setErrorNotice(null)
      },
      onStopped: () => {
        setIsRecording(false)
        setIsStarting(false)
      },
      onRequestAdded: (req) => {
        setRequests((prev) => [...prev, req])
        setSelectedReqIds((prev) => new Set([...prev, req.id]))
      },
      onRequestUpdated: (updated) => {
        setRequests((prev) => prev.map((r) => (r.id === updated.id || r.requestId === updated.requestId ? { ...r, ...updated } : r)))
      },
      onTransactionChanged: (data) => {
        setCurrentTransaction(data.transaction)
      },
      onCleared: () => {
        setRequests([])
        setSelectedReqIds(new Set())
        setInspectedReqId(null)
      },
      onError: (err) => {
        if (isRecording) {
          setErrorNotice(err)
        }
      },
    })

    streamUnsubRef.current = unsub

    return () => {
      unsub()
      streamUnsubRef.current = null
    }
  }, [isOpen, isRecording])

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (hideStatic && isStaticUrl(req.url)) return false
      if (hideAnalytics && isAnalyticsUrl(req.url)) return false
      if (methodFilter !== 'ALL' && req.method !== methodFilter) return false

      if (typeFilter === 'XHR') {
        const rt = (req.resourceType || '').toLowerCase()
        const mime = (req.mimeType || '').toLowerCase()
        if (!rt.includes('xhr') && !rt.includes('fetch') && !mime.includes('json') && !mime.includes('xml')) return false
      } else if (typeFilter === 'DOC') {
        const rt = (req.resourceType || '').toLowerCase()
        const mime = (req.mimeType || '').toLowerCase()
        if (!rt.includes('document') && !mime.includes('html')) return false
      } else if (typeFilter === 'STATIC') {
        if (!isStaticUrl(req.url)) return false
      } else if (typeFilter === 'FAILED') {
        if (!req.error && (!req.responseStatus || req.responseStatus < 400)) return false
      }

      if (searchText.trim()) {
        const query = searchText.toLowerCase()
        const matchUrl = req.url.toLowerCase().includes(query)
        const matchPath = req.path.toLowerCase().includes(query)
        const matchTx = req.transaction.toLowerCase().includes(query)
        if (!matchUrl && !matchPath && !matchTx) return false
      }
      return true
    })
  }, [requests, hideStatic, hideAnalytics, methodFilter, typeFilter, searchText])

  // Active inspected request
  const inspectedReq = useMemo(() => {
    if (!inspectedReqId) return filteredRequests[0] || null
    return requests.find((r) => r.id === inspectedReqId) || filteredRequests[0] || null
  }, [requests, filteredRequests, inspectedReqId])

  // Total selected count among filtered
  const selectedCount = useMemo(() => {
    let count = 0
    for (const r of filteredRequests) {
      if (selectedReqIds.has(r.id)) count++
    }
    return count
  }, [filteredRequests, selectedReqIds])

  // Estimated nodes preview
  const estimatedSummary = useMemo(() => {
    const selected = filteredRequests.filter((r) => selectedReqIds.has(r.id))
    if (selected.length === 0) return '0 nodes'

    const txSet = new Set(selected.map((r) => r.transaction || 'Default'))
    const parts: string[] = []
    if (createDefaults) parts.push('1 Defaults')
    if (groupByTx) parts.push(`${txSet.size} Transaction Controller${txSet.size > 1 ? 's' : ''}`)
    parts.push(`${selected.length} HTTP Request${selected.length > 1 ? 's' : ''}`)
    if (createHeaderMgr) parts.push(`${selected.length} Header Manager${selected.length > 1 ? 's' : ''}`)
    if (createCookieMgr) parts.push('1 Cookie Manager')
    if (parameterizeSecrets) parts.push('1 UDV (Secrets)')

    return parts.join(' + ')
  }, [filteredRequests, selectedReqIds, createDefaults, groupByTx, createHeaderMgr, createCookieMgr, parameterizeSecrets])

  if (!isOpen) return null

  // Copy helper
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    }).catch(() => {})
  }

  // Start live recording
  const handleStartRecording = async () => {
    if (isStarting || isRecording) return
    setIsStarting(true)
    setErrorNotice(null)

    try {
      await browserRecorderService.startRecording({
        browserType: selectedBrowser,
        targetUrl: targetUrl.trim() || 'https://google.com',
        initialTransaction: currentTransaction.trim() || '01_Open_Application',
        autoPageSplit,
      })
    } catch (err) {
      setIsStarting(false)
      setErrorNotice(err instanceof Error ? err.message : 'Could not start browser recording.')
    }
  }

  // Auto-Group all requests by primary URL route
  const handleAutoGroupByRoute = () => {
    if (requests.length === 0) return
    const routesMap = new Map<string, string>()
    let stepIdx = 1

    const updated = requests.map((r) => {
      try {
        let toParse = r.url
        if (!/^https?:\/\//i.test(toParse)) toParse = `https://${toParse}`
        const u = new URL(toParse)
        const segments = u.pathname.split('/').filter(Boolean)
        const primaryKey =
          segments.length >= 2
            ? `/${segments[0]}/${segments[1]}`
            : segments.length === 1
            ? `/${segments[0]}`
            : '/home'

        if (!routesMap.has(primaryKey)) {
          const cleanName = primaryKey.replace(/^\/|\/$/g, '').replace(/[/_.-]+/g, '_') || 'home'
          routesMap.set(primaryKey, `${String(stepIdx++).padStart(2, '0')}_Page_${cleanName}`)
        }
        return { ...r, transaction: routesMap.get(primaryKey)! }
      } catch {
        return r
      }
    })

    setRequests(updated)
    setErrorNotice(null)
  }

  // Apply new transaction step name to all selected requests
  const handleApplyBatchStep = () => {
    const trimmed = batchStepInput.trim()
    if (!trimmed || selectedReqIds.size === 0) return
    setRequests((prev) =>
      prev.map((r) => (selectedReqIds.has(r.id) ? { ...r, transaction: trimmed } : r))
    )
    setBatchStepInput('')
  }

  // Stop live recording
  const handleStopRecording = async () => {
    try {
      await browserRecorderService.stopRecording()
      setIsRecording(false)
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Failed to stop recording.')
    }
  }

  // Advance to next transaction step
  const handleAddTransactionStep = async () => {
    const nextName = nextTransactionInput.trim()
    if (!nextName) return
    try {
      await browserRecorderService.setTransaction(nextName)
      setCurrentTransaction(nextName)
      setNextTransactionInput('')
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Failed to set transaction.')
    }
  }

  // Clear recorded list
  const handleClear = async () => {
    try {
      await browserRecorderService.clearRecorded()
      setRequests([])
      setSelectedReqIds(new Set())
      setInspectedReqId(null)
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Failed to clear requests.')
    }
  }

  // Toggle select all in filtered list
  const handleToggleSelectAll = () => {
    const allFilteredSelected = filteredRequests.every((r) => selectedReqIds.has(r.id))
    const next = new Set(selectedReqIds)
    if (allFilteredSelected) {
      for (const r of filteredRequests) {
        next.delete(r.id)
      }
    } else {
      for (const r of filteredRequests) {
        next.add(r.id)
      }
    }
    setSelectedReqIds(next)
  }

  // Toggle single request selection
  const handleToggleRequest = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const next = new Set(selectedReqIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedReqIds(next)
  }

  // Handle HAR file upload / drop
  const handleHarFile = async (file: File) => {
    try {
      const text = await file.text()
      const result = parseHarContent(text)
      if (!result.success || result.requests.length === 0) {
        setErrorNotice(result.error || 'No valid HTTP requests found in HAR file.')
        return
      }
      setHarFileName(file.name)
      setRequests(result.requests)
      setSelectedReqIds(new Set(result.requests.map((r) => r.id)))
      if (result.requests.length > 0) {
        setInspectedReqId(result.requests[0].id)
      }
      setErrorNotice(null)
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Failed to read HAR file.')
    }
  }

  // Import selected requests into Test Plan
  const handleOpenCorrelationWizard = () => {
    const requestsToImport = filteredRequests.filter((r) => selectedReqIds.has(r.id))
    if (requestsToImport.length === 0) {
      setErrorNotice('Please select at least one request to correlate.')
      return
    }
    const detected = detectCorrelations(requestsToImport)
    setCorrelationCandidates(detected)
    setIsCorrelationWizardOpen(true)
  }

  const handleApplyCorrelationsAndImport = (selectedCandidates: CorrelationCandidate[]) => {
    const requestsToImport = filteredRequests.filter((r) => selectedReqIds.has(r.id))
    const conversionOptions: ConversionOptions = {
      groupByTransaction: groupByTx,
      createHeaderManager: createHeaderMgr,
      createCookieManager: createCookieMgr,
      createDefaults: createDefaults,
      cleanRedundantHeaders: cleanHeaders,
      maskSensitive: maskSensitive,
      parameterizeSecrets: parameterizeSecrets,
      customNaming: 'index-method-path',
    }

    const { nodes } = convertRecordedRequestsToNodes(requestsToImport, conversionOptions)
    const correlatedNodes = nodes.map((node) => applyCorrelationsToTree(node, selectedCandidates))

    onImport(correlatedNodes, targetContainerId)
    setIsCorrelationWizardOpen(false)
    onClose()
  }

  const handleImportToTestPlan = () => {
    const requestsToImport = filteredRequests.filter((r) => selectedReqIds.has(r.id))
    if (requestsToImport.length === 0) {
      setErrorNotice('Please select at least one request to import.')
      return
    }

    const conversionOptions: ConversionOptions = {
      groupByTransaction: groupByTx,
      createHeaderManager: createHeaderMgr,
      createCookieManager: createCookieMgr,
      createDefaults: createDefaults,
      cleanRedundantHeaders: cleanHeaders,
      maskSensitive: maskSensitive,
      parameterizeSecrets: parameterizeSecrets,
      customNaming: 'index-method-path',
    }

    const { nodes } = convertRecordedRequestsToNodes(requestsToImport, conversionOptions)
    if (nodes.length === 0) {
      setErrorNotice('No samplers could be generated.')
      return
    }

    onImport(nodes, targetContainerId)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container browser-recorder-studio"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1200px',
          width: '96%',
          height: '90vh',
          maxHeight: '940px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '12px',
          background: 'var(--bg-primary, #0f172a)',
          border: '1px solid var(--border-color, #334155)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: '12px 20px',
            background: 'var(--bg-secondary, #1e293b)',
            borderBottom: '1px solid var(--border-color, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isRecording ? '#ef4444' : '#818cf8',
              }}
            >
              <Radio size={18} className={isRecording ? 'recorder-pulse' : ''} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>
                  Browser & Network API Recorder
                </h3>
                {isRecording ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: 'rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                    LIVE RECORDING
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      background: 'rgba(148, 163, 184, 0.15)',
                      color: '#94a3b8',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    CDP Sniffer & HAR Parser
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                Capture live browser API traffic or import DevTools HAR to generate JMeter Samplers & Controllers.
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #334155)',
              }}
            >
              <button
                type="button"
                className={`recorder-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
                onClick={() => setActiveTab('live')}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'live' ? 'var(--accent, #6366f1)' : 'transparent',
                  color: activeTab === 'live' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Compass size={14} />
                Live Browser (CDP)
              </button>
              <button
                type="button"
                className={`recorder-tab-btn ${activeTab === 'har' ? 'active' : ''}`}
                onClick={() => setActiveTab('har')}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'har' ? 'var(--accent, #6366f1)' : 'transparent',
                  color: activeTab === 'har' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UploadCloud size={14} />
                Import HAR File
              </button>
            </div>

            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close recorder"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Error Notice */}
        {errorNotice && (
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} />
              <span>{errorNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorNotice(null)}
              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Top Controls Bar (Live vs HAR) */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg-secondary, #1e293b)',
            borderBottom: '1px solid var(--border-color, #334155)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {activeTab === 'live' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Target URL Input */}
              <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', position: 'relative' }}>
                <Globe size={15} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://your-website.com or https://api.demo.com"
                  value={targetUrl}
                  disabled={isRecording}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '32px',
                    fontSize: '0.84rem',
                    background: 'var(--input-bg, #0f172a)',
                    color: '#f8fafc',
                    border: '1px solid var(--border-color, #334155)',
                    borderRadius: '6px',
                    height: '34px',
                  }}
                />
              </div>

              {/* Browser Select */}
              <select
                value={selectedBrowser}
                disabled={isRecording}
                onChange={(e) => setSelectedBrowser(e.target.value as 'chrome' | 'edge' | 'custom')}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                  background: 'var(--input-bg, #0f172a)',
                  color: '#f8fafc',
                  border: '1px solid var(--border-color, #334155)',
                  minWidth: '150px',
                }}
              >
                {availableBrowsers.chrome && <option value="chrome">Google Chrome</option>}
                {availableBrowsers.edge && <option value="edge">Microsoft Edge</option>}
                {!availableBrowsers.chrome && !availableBrowsers.edge && (
                  <option value="chrome">Chrome (Auto-detect)</option>
                )}
              </select>

              {/* Auto Split Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  cursor: isRecording ? 'not-allowed' : 'pointer',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #334155)',
                  height: '34px',
                  boxSizing: 'border-box',
                }}
                title="Automatically create a new Transaction Step whenever you navigate to a new page or change SPA route"
              >
                <input
                  type="checkbox"
                  checked={autoPageSplit}
                  disabled={isRecording}
                  onChange={(e) => setAutoPageSplit(e.target.checked)}
                />
                <span>Auto-Split on Page Navigation</span>
              </label>

              {/* Start / Stop Button */}
              {!isRecording ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleStartRecording}
                  disabled={isStarting}
                  style={{
                    height: '34px',
                    padding: '0 16px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    cursor: isStarting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <Play size={14} fill="currentColor" />
                  {isStarting ? 'Launching Browser...' : 'Start Recording'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  style={{
                    height: '34px',
                    padding: '0 16px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <Square size={13} fill="currentColor" />
                  Stop Recording
                </button>
              )}

              {/* Clear button */}
              {requests.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClear}
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Clear all recorded requests"
                >
                  <Trash2 size={14} />
                  Clear
                </button>
              )}
            </div>
          ) : (
            /* HAR Import Banner */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  ref={harFileInputRef}
                  type="file"
                  accept=".har,application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleHarFile(f)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => harFileInputRef.current?.click()}
                  style={{
                    height: '34px',
                    padding: '0 14px',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <UploadCloud size={15} />
                  Choose .HAR File...
                </button>
                {harFileName ? (
                  <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 500, fontFamily: 'monospace' }}>
                    {harFileName} ({requests.length} requests parsed)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Export .har from DevTools (F12 -&gt; Network -&gt; Export HAR) and load here.
                  </span>
                )}
              </div>

              {requests.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClear}
                  style={{ height: '34px', padding: '0 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={14} />
                  Clear HAR
                </button>
              )}
            </div>
          )}

          {/* Active Transaction Stepper Bar (When live recording is active or has steps) */}
          {activeTab === 'live' && isRecording && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>
                <FolderPlus size={15} />
                <span>Active Step:</span>
              </div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {currentTransaction}
              </span>

              <span style={{ color: '#475569' }}>|</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Next step name (e.g. 02_Search_Product, 03_Checkout)..."
                  value={nextTransactionInput}
                  onChange={(e) => setNextTransactionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTransactionStep()
                  }}
                  style={{
                    flex: 1,
                    height: '28px',
                    padding: '0 8px',
                    fontSize: '0.8rem',
                    background: 'var(--input-bg, #0f172a)',
                    border: '1px solid var(--border-color, #334155)',
                    borderRadius: '4px',
                    color: '#f8fafc',
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddTransactionStep}
                  disabled={!nextTransactionInput.trim()}
                  style={{
                    height: '28px',
                    padding: '0 10px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ChevronRight size={13} />
                  Switch Step
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div
          style={{
            padding: '8px 20px',
            background: 'rgba(15, 23, 42, 0.7)',
            borderBottom: '1px solid var(--border-color, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search filter */}
            <div style={{ position: 'relative', width: '180px' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '7px', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Filter URL / path..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  width: '100%',
                  height: '26px',
                  paddingLeft: '26px',
                  fontSize: '0.76rem',
                  background: 'var(--input-bg, #1e293b)',
                  border: '1px solid var(--border-color, #334155)',
                  borderRadius: '4px',
                  color: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Category / Type Filter Tabs */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--input-bg, #1e293b)', padding: '2px', borderRadius: '4px' }}>
              {(['ALL', 'XHR', 'DOC', 'STATIC', 'FAILED'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  style={{
                    border: 'none',
                    padding: '2px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    background: typeFilter === t ? 'var(--accent, #6366f1)' : 'transparent',
                    color: typeFilter === t ? '#ffffff' : '#94a3b8',
                  }}
                >
                  {t === 'XHR' ? 'XHR/Fetch' : t === 'DOC' ? 'Doc' : t === 'STATIC' ? 'Static' : t === 'FAILED' ? 'Failed' : 'All Types'}
                </button>
              ))}
            </div>

            {/* Method filter buttons */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--input-bg, #1e293b)', padding: '2px', borderRadius: '4px' }}>
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethodFilter(m)}
                  style={{
                    border: 'none',
                    padding: '2px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    background: methodFilter === m ? 'var(--accent, #6366f1)' : 'transparent',
                    color: methodFilter === m ? '#ffffff' : '#94a3b8',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Smart Exclusion Checkboxes */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', cursor: 'pointer', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={hideStatic}
                onChange={(e) => setHideStatic(e.target.checked)}
              />
              <span>Hide Static (.js/.css/img)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', cursor: 'pointer', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={hideAnalytics}
                onChange={(e) => setHideAnalytics(e.target.checked)}
              />
              <span>Hide Analytics</span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Auto Group by Route Button */}
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAutoGroupByRoute}
              disabled={requests.length === 0}
              title="Automatically group all recorded requests into Transactions by their URL pathname route"
              style={{
                fontSize: '0.72rem',
                padding: '2px 9px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#38bdf8',
                borderColor: 'rgba(56, 189, 248, 0.3)',
              }}
            >
              <FolderTree size={12} />
              Auto-Group by Page/Route
            </button>

            {/* Batch Reassign Step Name */}
            {selectedCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="Set Step Name..."
                  value={batchStepInput}
                  onChange={(e) => setBatchStepInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyBatchStep()
                  }}
                  style={{
                    height: '24px',
                    padding: '0 6px',
                    fontSize: '0.72rem',
                    background: 'var(--input-bg, #0f172a)',
                    border: '1px solid var(--border-color, #334155)',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    width: '120px',
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleApplyBatchStep}
                  disabled={!batchStepInput.trim()}
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <Edit3 size={11} />
                  Assign ({selectedCount})
                </button>
              </div>
            )}

            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              <strong>{selectedCount}</strong>/{filteredRequests.length} selected
            </span>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleToggleSelectAll}
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {filteredRequests.every((r) => selectedReqIds.has(r.id)) && filteredRequests.length > 0 ? (
                <>
                  <SquareEmpty size={12} />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare size={12} />
                  Select All
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area (Table + Inspector Split) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Requests Table Column */}
          <div
            style={{
              flex: '1 1 58%',
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--border-color, #334155)',
              overflow: 'hidden',
            }}
          >
            {filteredRequests.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-muted, #94a3b8)',
                  textAlign: 'center',
                }}
              >
                {activeTab === 'live' ? (
                  <>
                    <Radio size={40} style={{ opacity: 0.4, marginBottom: '12px', color: '#818cf8' }} />
                    <h4 style={{ margin: '0 0 6px 0', color: '#e2e8f0', fontSize: '0.95rem' }}>
                      {isRecording ? 'Waiting for browser network requests...' : 'Ready to record'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', maxWidth: '360px', lineHeight: 1.5 }}>
                      {isRecording
                        ? 'Interact with the opened browser window. All API and page requests will appear here in real time.'
                        : 'Enter your website URL above and click "Start Recording" to launch an automated Chrome/Edge session.'}
                    </p>
                  </>
                ) : (
                  <>
                    <UploadCloud size={40} style={{ opacity: 0.4, marginBottom: '12px', color: '#818cf8' }} />
                    <h4 style={{ margin: '0 0 6px 0', color: '#e2e8f0', fontSize: '0.95rem' }}>
                      No HAR file loaded
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', maxWidth: '360px', lineHeight: 1.5 }}>
                      Click "Choose .HAR File..." above or drag-and-drop a .har export from your browser developer tools.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table className="recorder-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: 'var(--bg-secondary, #1e293b)',
                      zIndex: 2,
                      borderBottom: '1px solid var(--border-color, #334155)',
                    }}
                  >
                    <tr>
                      <th style={{ width: '32px', padding: '6px 8px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredRequests.length > 0 && filteredRequests.every((r) => selectedReqIds.has(r.id))}
                          onChange={handleToggleSelectAll}
                        />
                      </th>
                      <th style={{ width: '60px', padding: '6px 8px', textAlign: 'left' }}>Method</th>
                      <th style={{ width: '55px', padding: '6px 8px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Path / URL</th>
                      <th style={{ width: '120px', padding: '6px 8px', textAlign: 'left' }}>Transaction</th>
                      <th style={{ width: '65px', padding: '6px 8px', textAlign: 'right' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req, idx) => {
                      const isSelected = selectedReqIds.has(req.id)
                      const isInspected = inspectedReq?.id === req.id
                      const methodColor =
                        req.method === 'POST' ? '#fbbf24' :
                        req.method === 'GET' ? '#34d399' :
                        req.method === 'DELETE' ? '#f87171' :
                        req.method === 'PUT' ? '#60a5fa' : '#c084fc'

                      const statusColor =
                        !req.responseStatus ? '#94a3b8' :
                        req.responseStatus < 300 ? '#10b981' :
                        req.responseStatus < 400 ? '#38bdf8' :
                        req.responseStatus < 500 ? '#fbbf24' : '#ef4444'

                      return (
                        <tr
                          key={req.id}
                          className={`recorder-row ${isInspected ? 'inspected-row' : ''}`}
                          onClick={() => setInspectedReqId(req.id)}
                          style={{
                            cursor: 'pointer',
                            background: isInspected ? 'rgba(99, 102, 241, 0.15)' : idx % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'transparent',
                            borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                          }}
                        >
                          <td style={{ textAlign: 'center', padding: '6px 8px' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRequest(req.id)}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: methodColor,
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: 'rgba(255, 255, 255, 0.05)',
                              }}
                            >
                              {req.method}
                            </span>
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColor }}>
                              {req.responseStatus || (req.error ? 'ERR' : '...')}
                            </span>
                          </td>
                          <td style={{ padding: '6px 8px', maxWidth: '270px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.url}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {req.hasSensitiveData && (
                                <span title={`Sensitive data detected: ${req.sensitiveFields?.join(', ')}`}>
                                  <ShieldAlert size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                </span>
                              )}
                              <span style={{ fontFamily: 'monospace', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {req.path || req.url}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.transaction}>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {req.transaction}
                            </span>
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8' }}>
                            {req.durationMs ? `${req.durationMs}ms` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Request Detail Inspector Column */}
          <div
            style={{
              flex: '1 1 42%',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-primary, #0f172a)',
              overflow: 'hidden',
            }}
          >
            {inspectedReq ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Inspector Header */}
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-secondary, #1e293b)',
                    borderBottom: '1px solid var(--border-color, #334155)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: 'rgba(99, 102, 241, 0.2)',
                          color: '#818cf8',
                        }}
                      >
                        {inspectedReq.method}
                      </span>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontFamily: 'monospace',
                          color: '#38bdf8',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={inspectedReq.url}
                      >
                        {inspectedReq.url}
                      </span>
                    </div>

                    {inspectedReq.hasSensitiveData && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          flexShrink: 0,
                        }}
                      >
                        <Key size={11} /> Sensitive Data
                      </span>
                    )}
                  </div>

                  {/* Inspector Tabs */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    {(['body', 'headers', 'query', 'response', 'sensitive'] as const).map((t) => {
                      if (t === 'sensitive' && !inspectedReq.hasSensitiveData) return null
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setInspectedTab(t)}
                          style={{
                            border: 'none',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            background: inspectedTab === t ? 'var(--accent, #6366f1)' : 'rgba(255, 255, 255, 0.05)',
                            color: inspectedTab === t ? '#ffffff' : '#94a3b8',
                            textTransform: 'capitalize',
                          }}
                        >
                          {t === 'body'
                            ? `Body (${inspectedReq.postData || inspectedReq.postParams ? 'Payload' : 'Empty'})`
                            : t === 'headers'
                            ? `Headers (${inspectedReq.requestHeaders.length})`
                            : t === 'query'
                            ? `Query (${inspectedReq.queryParams?.length || 0})`
                            : t === 'response'
                            ? 'Response'
                            : `Security (${inspectedReq.sensitiveFields?.length || 0})`}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Inspector Body Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                  {inspectedTab === 'body' && (
                    <div>
                      {inspectedReq.postData ? (
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => handleCopyText(inspectedReq.postData || '', 'body')}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '8px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              borderRadius: '4px',
                              color: '#94a3b8',
                              padding: '3px 6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.7rem',
                            }}
                          >
                            {copiedKey === 'body' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            {copiedKey === 'body' ? 'Copied' : 'Copy'}
                          </button>
                          <pre
                            style={{
                              margin: 0,
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              color: '#cbd5e1',
                              background: '#090d16',
                              padding: '10px',
                              borderRadius: '6px',
                              border: '1px solid #1e293b',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              maxHeight: '340px',
                              overflowY: 'auto',
                            }}
                          >
                            {inspectedReq.postData}
                          </pre>
                        </div>
                      ) : inspectedReq.postParams && inspectedReq.postParams.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {inspectedReq.postParams.map((p, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                gap: '8px',
                                fontSize: '0.74rem',
                                fontFamily: 'monospace',
                                background: '#090d16',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #1e293b',
                              }}
                            >
                              <strong style={{ color: '#38bdf8', minWidth: '110px' }}>{p.name}:</strong>
                              <span style={{ color: '#cbd5e1', wordBreak: 'break-all' }}>{p.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: '10px 0' }}>
                          No request body payload (GET or query-only request).
                        </p>
                      )}
                    </div>
                  )}

                  {inspectedTab === 'headers' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {inspectedReq.requestHeaders.map((h: RecordedHeader, i: number) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: '8px',
                            fontSize: '0.74rem',
                            fontFamily: 'monospace',
                            background: '#090d16',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #1e293b',
                          }}
                        >
                          <strong style={{ color: '#818cf8', minWidth: '110px' }}>{h.name}:</strong>
                          <span style={{ color: '#cbd5e1', wordBreak: 'break-all' }}>{h.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {inspectedTab === 'query' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {inspectedReq.queryParams && inspectedReq.queryParams.length > 0 ? (
                        inspectedReq.queryParams.map((q: RecordedParam, i: number) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              gap: '8px',
                              fontSize: '0.74rem',
                              fontFamily: 'monospace',
                              background: '#090d16',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #1e293b',
                            }}
                          >
                            <strong style={{ color: '#34d399', minWidth: '110px' }}>{q.name}:</strong>
                            <span style={{ color: '#cbd5e1', wordBreak: 'break-all' }}>{q.value}</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: '10px 0' }}>
                          No query string parameters.
                        </p>
                      )}
                    </div>
                  )}

                  {inspectedTab === 'response' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.75rem' }}>
                        <span style={{ color: '#94a3b8' }}>Status:</span>
                        <strong style={{ color: '#10b981' }}>{inspectedReq.responseStatus || '—'} {inspectedReq.responseStatusText || ''}</strong>
                        {inspectedReq.mimeType && <span style={{ color: '#64748b' }}>({inspectedReq.mimeType})</span>}
                      </div>
                      {inspectedReq.responseBody ? (
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => handleCopyText(inspectedReq.responseBody || '', 'response')}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '8px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              borderRadius: '4px',
                              color: '#94a3b8',
                              padding: '3px 6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.7rem',
                            }}
                          >
                            {copiedKey === 'response' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            {copiedKey === 'response' ? 'Copied' : 'Copy'}
                          </button>
                          <pre
                            style={{
                              margin: 0,
                              fontSize: '0.74rem',
                              fontFamily: 'monospace',
                              color: '#cbd5e1',
                              background: '#090d16',
                              padding: '10px',
                              borderRadius: '6px',
                              border: '1px solid #1e293b',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              maxHeight: '320px',
                              overflowY: 'auto',
                            }}
                          >
                            {inspectedReq.responseBody.slice(0, 3000)}
                            {inspectedReq.responseBody.length > 3000 ? '\n... [truncated]' : ''}
                          </pre>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: '10px 0' }}>
                          No response body captured.
                        </p>
                      )}
                    </div>
                  )}

                  {inspectedTab === 'sensitive' && inspectedReq.hasSensitiveData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          color: '#fbbf24',
                        }}
                      >
                        The following sensitive keys or headers were detected in this request:
                      </div>
                      {inspectedReq.sensitiveFields?.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '4px 8px',
                            background: '#090d16',
                            border: '1px solid #1e293b',
                            borderRadius: '4px',
                            fontSize: '0.74rem',
                            fontFamily: 'monospace',
                            color: '#f87171',
                          }}
                        >
                          ● {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                Select a request from the table to inspect details.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Import Config */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg-secondary, #1e293b)',
            borderTop: '1px solid var(--border-color, #334155)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Options Row 1: Target Container & Structure */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Target Container Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} style={{ color: 'var(--accent, #6366f1)' }} />
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 500 }}>Target:</span>
                <select
                  value={targetContainerId}
                  onChange={(e) => setTargetContainerId(e.target.value)}
                  style={{
                    height: '30px',
                    padding: '0 8px',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    background: 'var(--input-bg, #0f172a)',
                    color: '#f8fafc',
                    border: '1px solid var(--border-color, #334155)',
                    maxWidth: '220px',
                  }}
                >
                  {containers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {'\u00A0'.repeat(c.depth * 2)}{c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Checkboxes */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={groupByTx}
                  onChange={(e) => setGroupByTx(e.target.checked)}
                />
                <span>Group in <strong>Transaction Controllers</strong></span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={createHeaderMgr}
                  onChange={(e) => setCreateHeaderMgr(e.target.checked)}
                />
                <span>Create <strong>HTTP Header Manager</strong></span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={createCookieMgr}
                  onChange={(e) => setCreateCookieMgr(e.target.checked)}
                />
                <span>Create <strong>HTTP Cookie Manager</strong></span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={createDefaults}
                  onChange={(e) => setCreateDefaults(e.target.checked)}
                />
                <span>Extract <strong>HTTP Defaults</strong></span>
              </label>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="button" className="btn-secondary" onClick={onClose} style={{ height: '32px', padding: '0 14px', fontSize: '0.82rem' }}>
                Close
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleOpenCorrelationWizard}
                disabled={selectedCount === 0}
                title="Detect dynamic tokens and extract them automatically with JSON / Regex Extractors"
                style={{
                  height: '32px',
                  padding: '0 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: selectedCount > 0 ? 'rgba(99, 102, 241, 0.15)' : '#1e293b',
                  border: '1px solid',
                  borderColor: selectedCount > 0 ? '#6366f1' : '#334155',
                  color: selectedCount > 0 ? '#a5b4fc' : '#64748b',
                  borderRadius: '6px',
                  cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                <Link2 size={14} />
                <span>Smart Correlate ({selectedCount})</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleImportToTestPlan}
                disabled={selectedCount === 0}
                style={{
                  height: '32px',
                  padding: '0 16px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: selectedCount > 0 ? 'var(--accent, #6366f1)' : '#334155',
                  cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                <Sparkles size={14} />
                Import {selectedCount} Sampler{selectedCount !== 1 ? 's' : ''} into Test Plan
              </button>
            </div>
          </div>

          {/* Options Row 2: Redaction & Security Settings & Preview */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(51, 65, 85, 0.5)',
              fontSize: '0.76rem',
              color: '#94a3b8',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={cleanHeaders}
                  onChange={(e) => setCleanHeaders(e.target.checked)}
                />
                <span>Clean Redundant Browser Headers</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={maskSensitive}
                  disabled={parameterizeSecrets}
                  onChange={(e) => setMaskSensitive(e.target.checked)}
                />
                <span>Mask Sensitive Values (*****)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#38bdf8' }}>
                <input
                  type="checkbox"
                  checked={parameterizeSecrets}
                  onChange={(e) => {
                    setParameterizeSecrets(e.target.checked)
                    if (e.target.checked) setMaskSensitive(false)
                  }}
                />
                <span>Parameterize Secrets into <strong>${'{AUTH_TOKEN}'}, ${'{PASSWORD}'}</strong> + UDV</span>
              </label>
            </div>

            <div style={{ color: '#818cf8', fontWeight: 500 }}>
              Preview: {estimatedSummary}
            </div>
          </div>
        </div>
      </div>

      <CorrelationWizardModal
        isOpen={isCorrelationWizardOpen}
        onClose={() => setIsCorrelationWizardOpen(false)}
        candidates={correlationCandidates}
        onApply={handleApplyCorrelationsAndImport}
      />
    </div>
  )
}
