import { RotateCcw, Search } from 'lucide-react'
import type { SampleFiltersState } from './useSampleFilters'

export function VrtFilterRow({ filters }: { filters: SampleFiltersState }) {
  const {
    searchQuery,
    setSearchQuery,
    caseSensitive,
    setCaseSensitive,
    isRegexp,
    setIsRegexp,
    filterErrorsOnly,
    setFilterErrorsOnly,
    setFilterSuccessOnly,
    autoScroll,
    setAutoScroll,
  } = filters
  return (
        <div className="vrt-toolbar-row2">
          {/* Search bar */}
          <div className="vrt-search-group">
            <Search size={14} className="vrt-search-icon" />
            <input
              type="text"
              className="vrt-search-input"
              placeholder="Search sample name, URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                className="vrt-btn-reset"
                onClick={() => setSearchQuery('')}
                title="Reset search"
              >
                <RotateCcw size={12} />
              </button>
            ) : null}
          </div>

          {/* Options */}
          <label className="vrt-checkbox-label">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            <span>Case sensitive</span>
          </label>

          <label className="vrt-checkbox-label">
            <input
              type="checkbox"
              checked={isRegexp}
              onChange={(e) => setIsRegexp(e.target.checked)}
            />
            <span>Regexp</span>
          </label>

          <label className="vrt-checkbox-label">
            <input
              type="checkbox"
              checked={filterErrorsOnly}
              onChange={(e) => {
                setFilterErrorsOnly(e.target.checked)
                if (e.target.checked) setFilterSuccessOnly(false)
              }}
            />
            <span className="error-text">Errors only</span>
          </label>

          <label className="vrt-checkbox-label">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span>Auto scroll</span>
          </label>
        </div>
  )
}
