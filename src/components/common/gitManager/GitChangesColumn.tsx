import { Download } from 'lucide-react'
import type { GitRepo } from './useGitRepo'
import type { GitActions } from './useGitActions'
import { GitFileRow } from './GitFileRow'
import { GitCommitForm } from './GitCommitForm'

interface GitChangesColumnProps {
  repo: GitRepo
  actions: GitActions
  filterQuery: string
  setFilterQuery: (value: string) => void
}

export function GitChangesColumn({ repo, actions, filterQuery, setFilterQuery }: GitChangesColumnProps) {
  const { status, loading, error, actionMessage, selectedFile, setSelectedFile } = repo
  const { handlePull } = actions
  const filteredFiles = (status?.files || []).filter((f) =>
    f.path.toLowerCase().includes(filterQuery.toLowerCase())
  )

  return (
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
          filteredFiles.map((file) => (
            <GitFileRow key={file.path} file={file} isSelected={selectedFile === file.path} onSelect={setSelectedFile} />
          ))
        )}
      </div>

      {/* Pinned Commit Form */}
      <GitCommitForm actions={actions} loading={loading} actionMessage={actionMessage} error={error} />
    </div>
  )
}
