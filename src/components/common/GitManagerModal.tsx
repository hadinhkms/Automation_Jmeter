// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { useEffect, useState } from 'react'
import {
  Download,
  FileCode2,
  FileDiff,
  FileSpreadsheet,
  FileText,
  GitBranch,
  GitCommit,
  RefreshCw,
  Send,
  X,
} from 'lucide-react'
import { gitService, type GitStatusResult } from '../../services/gitService'
import { JmxDiffPanel } from '../git/JmxDiffPanel'

interface GitManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GitManagerModal({ isOpen, onClose }: GitManagerModalProps) {
  const [status, setStatus] = useState<GitStatusResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [commitMessage, setCommitMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diffText, setDiffText] = useState<string>('')
  const [diffLoading, setDiffLoading] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const [branches, setBranches] = useState<string[]>([])
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [branchLoading, setBranchLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'working-tree' | 'jmx-diff'>('working-tree')

  const loadStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await gitService.getStatus()
      setStatus(res)
      if (res.files.length > 0 && !selectedFile) {
        setSelectedFile(res.files[0].path)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      const res = await gitService.getBranches()
      setBranches(res.branches)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadStatus()
      loadBranches()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (selectedFile) {
      setDiffLoading(true)
      gitService
        .getDiff(selectedFile)
        .then((res) => setDiffText(res.diff))
        .catch(() => setDiffText('No diff available or file is untracked.'))
        .finally(() => setDiffLoading(false))
    } else {
      setDiffText('')
    }
  }, [selectedFile])

  const handleCommit = async (pushAfter = false) => {
    if (!commitMessage.trim()) {
      setError('Please enter a commit message.')
      return
    }
    setLoading(true)
    setError(null)
    setActionMessage('Committing changes...')
    try {
      const res = await gitService.commit(commitMessage.trim())
      if (!res.success) {
        throw new Error(res.error || 'Commit failed')
      }
      setCommitMessage('')
      if (pushAfter) {
        setActionMessage('Pushing to remote...')
        const pushRes = await gitService.push()
        if (!pushRes.success) throw new Error(pushRes.error || 'Push failed')
        setActionMessage('✅ Committed and Pushed successfully!')
      } else {
        setActionMessage('✅ Committed successfully!')
      }
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handlePull = async () => {
    setLoading(true)
    setError(null)
    setActionMessage('Pulling latest changes...')
    try {
      const res = await gitService.pull()
      if (!res.success) throw new Error(res.error || 'Pull failed')
      setActionMessage('✅ Pulled latest changes successfully!')
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (branch: string, createNew = false) => {
    setBranchLoading(true)
    setError(null)
    setActionMessage(`Switching to branch ${branch}...`)
    try {
      const res = await gitService.checkout(branch, createNew)
      if (!res.success) throw new Error(res.error || 'Checkout failed')
      setActionMessage(`✅ Switched to branch: ${branch}`)
      setShowBranchDropdown(false)
      setNewBranchName('')
      await loadStatus()
      await loadBranches()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBranchLoading(false)
    }
  }

  if (!isOpen) return null

  const filteredFiles = (status?.files || []).filter((f) =>
    f.path.toLowerCase().includes(filterQuery.toLowerCase())
  )

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 1240,
          width: '95vw',
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
        }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GitBranch size={20} color="#2563eb" />
            <h3>Git Version Control & JMX Visual Diff Viewer</h3>
            {status?.branch && (
              <span
                style={{
                  fontSize: 12,
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                {status.branch}
              </span>
            )}
            <div style={{ position: 'relative' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                disabled={branchLoading}
              >
                <GitBranch size={12} />
                {branchLoading ? 'Switching...' : 'Switch Branch'}
              </button>
              {showBranchDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    background: 'var(--bg-primary, #1e293b)',
                    border: '1px solid var(--border-color, #334155)',
                    borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    zIndex: 10000,
                    minWidth: 220,
                    maxHeight: 300,
                    overflow: 'auto',
                    padding: 6,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ padding: '4px 8px', fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branches</div>
                  {branches.map((b) => (
                    <button
                      key={b}
                      onClick={() => handleCheckout(b)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 10px',
                        fontSize: 12,
                        background: b === status?.branch ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                        color: b === status?.branch ? '#60a5fa' : 'var(--text-color, #e2e8f0)',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: b === status?.branch ? 600 : 400,
                      }}
                    >
                      {b === status?.branch ? `● ${b}` : b}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border-color, #334155)', margin: '6px 0', paddingTop: 6 }}>
                    <div style={{ display: 'flex', gap: 4, padding: '0 4px' }}>
                      <input
                        type="text"
                        placeholder="New branch name..."
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && newBranchName.trim()) handleCheckout(newBranchName.trim(), true) }}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          fontSize: 11,
                          background: 'var(--bg-secondary, #0f172a)',
                          border: '1px solid var(--border-color, #475569)',
                          borderRadius: 4,
                          color: 'var(--text-color, #e2e8f0)',
                          outline: 'none',
                        }}
                      />
                      <button
                        className="btn-primary"
                        style={{ fontSize: 10, padding: '3px 8px' }}
                        disabled={!newBranchName.trim()}
                        onClick={() => handleCheckout(newBranchName.trim(), true)}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-icon" onClick={loadStatus} title="Refresh Git Status">
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
            <button className="btn-icon" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Git Sub Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '6px 24px',
            borderBottom: '1px solid var(--border-color, #334155)',
            background: 'var(--bg-secondary, rgba(15, 23, 42, 0.4))',
          }}
        >
          <button
            onClick={() => setActiveTab('working-tree')}
            style={{
              padding: '6px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'working-tree' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'working-tree' ? '#60a5fa' : 'var(--text-muted, #94a3b8)',
            }}
          >
            Working Tree Changes ({status?.files.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('jmx-diff')}
            style={{
              padding: '6px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'jmx-diff' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'jmx-diff' ? '#60a5fa' : 'var(--text-muted, #94a3b8)',
            }}
          >
            JMX Semantic Diff
          </button>
        </div>

        {activeTab === 'jmx-diff' ? (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <JmxDiffPanel branches={branches} currentBranch={status?.branch || 'main'} />
          </div>
        ) : (
          <div
          className="modal-body modal-body-split"
          style={{
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: 20,
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
            padding: '18px 24px',
          }}
        >
          {/* Left Column: File List & Commit Action */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                flexShrink: 0,
              }}
            >
              <strong style={{ fontSize: 13.5, color: '#0f172a' }}>
                Working Tree Changes ({status?.files.length ?? 0})
              </strong>
              <button
                className="btn btn-secondary"
                onClick={handlePull}
                disabled={loading}
                style={{ padding: '3px 10px', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Download size={12} /> Pull
              </button>
            </div>

            {/* Search Filter */}
            <div style={{ marginBottom: 10, flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Search changed files..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: 32,
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* File List */}
            <div
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                background: '#f8fafc',
                overflowY: 'auto',
                padding: 6,
              }}
            >
              {filteredFiles.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12.5 }}>
                  {status?.files.length === 0
                    ? 'Working tree clean. No uncommitted changes.'
                    : 'No files match your search.'}
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isSelected = selectedFile === file.path
                  const isJmx = file.path.endsWith('.jmx')
                  const isCsv = file.path.endsWith('.csv')
                  return (
                    <div
                      key={file.path}
                      onClick={() => setSelectedFile(file.path)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12.5,
                        background: isSelected ? '#dbeafe' : 'transparent',
                        color: isSelected ? '#1d4ed8' : '#1e293b',
                        fontWeight: isSelected ? 600 : 400,
                        marginBottom: 3,
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isJmx ? (
                          <FileCode2 size={15} color="#d97706" />
                        ) : isCsv ? (
                          <FileSpreadsheet size={15} color="#059669" />
                        ) : (
                          <FileText size={15} color="#64748b" />
                        )}
                        <span title={file.path}>{file.path}</span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          flexShrink: 0,
                          background:
                            file.status === 'modified'
                              ? '#fef3c7'
                              : file.status === 'added' || file.status === 'untracked'
                                ? '#d1fae5'
                                : '#fee2e2',
                          color:
                            file.status === 'modified'
                              ? '#b45309'
                              : file.status === 'added' || file.status === 'untracked'
                                ? '#047857'
                                : '#b91c1c',
                        }}
                      >
                        {file.status === 'untracked' ? 'NEW' : file.status.slice(0, 3)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pinned Commit Form */}
            <div style={{ marginTop: 12, flexShrink: 0 }}>
              <textarea
                rows={2}
                placeholder="Commit message (e.g. Update load test concurrency & add token extractor)..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                style={{
                  width: '100%',
                  resize: 'none',
                  fontSize: 12,
                  padding: '8px 10px',
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleCommit(false)}
                  disabled={loading || !commitMessage.trim()}
                  style={{
                    flex: 1,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <GitCommit size={14} /> Commit
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleCommit(true)}
                  disabled={loading || !commitMessage.trim()}
                  style={{
                    flex: 1,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <Send size={14} /> Commit & Push
                </button>
              </div>

              {actionMessage && (
                <div style={{ fontSize: 12, marginTop: 6, color: '#059669', fontWeight: 500 }}>
                  {actionMessage}
                </div>
              )}
              {error && (
                <div style={{ fontSize: 12, marginTop: 6, color: '#dc2626', fontWeight: 500 }}>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Visual Diff Viewer (Full Vertical Space) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                <FileDiff size={17} color="#2563eb" />
                <span>Visual Diff: {selectedFile || 'Select a file on the left to inspect'}</span>
              </div>
              {selectedFile && (
                <span
                  style={{
                    fontSize: 11,
                    color: '#1d4ed8',
                    background: '#dbeafe',
                    padding: '3px 9px',
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  {selectedFile.endsWith('.jmx') ? 'JMX Tree Diff' : selectedFile.split('.').pop()?.toUpperCase()}
                </span>
              )}
            </div>

            <div
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                background: '#0d1117',
                color: '#c9d1d9',
                fontFamily: 'monospace',
                fontSize: 12.5,
                overflowY: 'auto',
                padding: 16,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.55,
              }}
            >
              {diffLoading ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#888' }}>Loading diff...</div>
              ) : diffText ? (
                diffText.split('\n').map((line, i) => {
                  let color = '#c9d1d9'
                  let bg = 'transparent'
                  if (line.startsWith('+') && !line.startsWith('+++')) {
                    color = '#3fb950'
                    bg = 'rgba(46, 160, 67, 0.15)'
                  } else if (line.startsWith('-') && !line.startsWith('---')) {
                    color = '#f85149'
                    bg = 'rgba(248, 81, 73, 0.15)'
                  } else if (line.startsWith('@@')) {
                    color = '#58a6ff'
                    bg = 'rgba(56, 139, 253, 0.1)'
                  }
                  return (
                    <div key={i} style={{ color, background: bg, padding: '1px 6px', borderRadius: 2 }}>
                      {line}
                    </div>
                  )
                })
              ) : (
                <div style={{ padding: 30, textAlign: 'center', color: '#888' }}>
                  {selectedFile ? 'No changes detected for this file against HEAD.' : 'Select a file on the left to inspect changes.'}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
