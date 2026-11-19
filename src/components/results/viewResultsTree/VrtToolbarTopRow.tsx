import type { RefObject } from 'react'
import { BarChart3, CheckCircle2, FolderOpen, ListFilter, XCircle } from 'lucide-react'
import type { SampleFiltersState } from './useSampleFilters'

interface VrtToolbarTopRowProps {
  activeRunId?: string | null
  isReal: boolean
  fileInputRef: RefObject<HTMLInputElement>
  viewMode: 'tree' | 'dashboard'
  setViewMode: (mode: 'tree' | 'dashboard') => void
  totalCount: number
  successCount: number
  errorCount: number
  filters: SampleFiltersState
}

export function VrtToolbarTopRow({
  activeRunId,
  isReal,
  fileInputRef,
  viewMode,
  setViewMode,
  totalCount,
  successCount,
  errorCount,
  filters,
}: VrtToolbarTopRowProps) {
  const { filterErrorsOnly, setFilterErrorsOnly, filterSuccessOnly, setFilterSuccessOnly } = filters
  return (
        <div className="vrt-toolbar-row1">
          <div className="vrt-file-path-group">
            <span className="vrt-label">Results file:</span>
            <input
              type="text"
              readOnly
              className="vrt-path-input"
              value={activeRunId ? `runs/${activeRunId}/results.jtl` : 'runs/latest/results.jtl'}
            />
            <button
              type="button"
              className="vrt-browse-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Open / Import JTL or CSV file from your computer"
            >
              <FolderOpen size={13} />
              <span>Browse...</span>
            </button>
            {isReal ? (
              <span className="vrt-mode-tag live">LIVE JTL</span>
            ) : (
              <span className="vrt-mode-tag mock">MOCK</span>
            )}
          </div>


          <div className="vrt-stats-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', padding: 2, borderRadius: 6, border: '1px solid var(--border-color, #444)', marginRight: 4 }}>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'tree' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('tree')}
                style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, height: 26 }}
              >
                <ListFilter size={12} /> Samples Tree
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('dashboard')}
                style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, height: 26 }}
              >
                <BarChart3 size={12} /> Live APM Dashboard
              </button>
            </div>

            <span className="stat-pill total">
              Total: <strong>{totalCount}</strong>
            </span>
            <span
              className={`stat-pill success ${filterSuccessOnly ? 'active' : ''}`}
              onClick={() => {
                setFilterSuccessOnly(!filterSuccessOnly)
                setFilterErrorsOnly(false)
              }}
              title="Click to toggle Success filter"
            >
              <CheckCircle2 size={13} /> {successCount}
            </span>
            <span
              className={`stat-pill error ${filterErrorsOnly ? 'active' : ''}`}
              onClick={() => {
                setFilterErrorsOnly(!filterErrorsOnly)
                setFilterSuccessOnly(false)
              }}
              title="Click to toggle Error filter"
            >
              <XCircle size={13} /> {errorCount}
            </span>
          </div>
        </div>
  )
}
