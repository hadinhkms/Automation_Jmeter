import { useState } from 'react'
import { JmxDiffPanel } from '../git/JmxDiffPanel'
import type { GitTab } from '../../models/gitManager'
import { useGitRepo } from './gitManager/useGitRepo'
import { useGitDiff } from './gitManager/useGitDiff'
import { useGitActions } from './gitManager/useGitActions'
import { GitManagerHeader } from './gitManager/GitManagerHeader'
import { GitTabsBar } from './gitManager/GitTabsBar'
import { GitChangesColumn } from './gitManager/GitChangesColumn'
import { GitDiffViewer } from './gitManager/GitDiffViewer'

interface GitManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GitManagerModal({ isOpen, onClose }: GitManagerModalProps) {
  const repo = useGitRepo(isOpen)
  const { status, branches, selectedFile } = repo
  const { diffText, diffLoading } = useGitDiff(selectedFile)
  const actions = useGitActions(repo)
  const [filterQuery, setFilterQuery] = useState('')
  const [activeTab, setActiveTab] = useState<GitTab>('working-tree')

  if (!isOpen) return null

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
        <GitManagerHeader repo={repo} actions={actions} onClose={onClose} />

        {/* Git Sub Tabs */}
        <GitTabsBar activeTab={activeTab} setActiveTab={setActiveTab} fileCount={status?.files.length ?? 0} />

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
          <GitChangesColumn repo={repo} actions={actions} filterQuery={filterQuery} setFilterQuery={setFilterQuery} />

          {/* Right Column: Visual Diff Viewer (Full Vertical Space) */}
          <GitDiffViewer selectedFile={selectedFile} diffText={diffText} diffLoading={diffLoading} />
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
