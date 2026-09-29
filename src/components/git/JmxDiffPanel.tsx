import { useState } from 'react'
import { GitCompare, Loader2 } from 'lucide-react'
import { jmxDiffService, type JmxDiffNode, type JmxDiffResult } from '../../services/jmxDiffService'
import { JmxDiffNodeTree } from './JmxDiffNodeTree'
import { JmxDiffFieldInspector } from './JmxDiffFieldInspector'

interface JmxDiffPanelProps {
  branches: string[]
  currentBranch: string
}

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid var(--border-color, #475569)',
  background: 'var(--bg-primary, #0f172a)',
  color: 'var(--text-color, #e2e8f0)',
  fontSize: 12,
}

export function JmxDiffPanel({ branches, currentBranch }: JmxDiffPanelProps) {
  const [branchA, setBranchA] = useState(branches[0] || 'main')
  const [branchB, setBranchB] = useState(currentBranch || 'HEAD')
  const [filePath, setFilePath] = useState('plans/test.jmx')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diff, setDiff] = useState<JmxDiffResult | null>(null)
  const [selectedNode, setSelectedNode] = useState<JmxDiffNode | null>(null)

  const handleCompare = async () => {
    if (branchA === branchB) {
      setError('Please select two different branches or revisions to compare.')
      return
    }
    setLoading(true)
    setError(null)
    setSelectedNode(null)
    try {
      const res = await jmxDiffService.getDiff(branchA, branchB, filePath)
      setDiff(res)
      if (res.error) setError(res.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Selector Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-color, #334155)',
          background: 'var(--bg-secondary, rgba(15, 23, 42, 0.4))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Base (A):</span>
          <select value={branchA} onChange={(e) => setBranchA(e.target.value)} style={selectStyle}>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <GitCompare size={16} color="#94a3b8" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Compare (B):</span>
          <select value={branchB} onChange={(e) => setBranchB(e.target.value)} style={selectStyle}>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <input
          type="text"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          placeholder="Path to .jmx file"
          style={{ ...selectStyle, width: 140 }}
        />

        <button
          className="btn-primary"
          onClick={handleCompare}
          disabled={loading || branchA === branchB}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 12px' }}
        >
          {loading ? <Loader2 size={14} className="spin" /> : <GitCompare size={14} />}
          <span>Compare</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Summary Chips */}
      {diff && (
        <div style={{ display: 'flex', gap: 12, padding: '6px 16px', fontSize: 12, borderBottom: '1px solid var(--border-color, #334155)' }}>
          <span style={{ color: '#4ade80', fontWeight: 600 }}>+{diff.added.length} Added</span>
          <span style={{ color: '#f87171', fontWeight: 600 }}>-{diff.removed.length} Removed</span>
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>~{diff.changed.length} Modified</span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>={diff.unchangedCount} Unchanged</span>
        </div>
      )}

      {/* Diff Views */}
      {diff ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <JmxDiffNodeTree diff={diff} selectedNode={selectedNode} onSelectNode={setSelectedNode} />
          <JmxDiffFieldInspector selectedNode={selectedNode} />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: 13 }}>
          Select two branches and click Compare to inspect visual differences.
        </div>
      )}
    </div>
  )
}
