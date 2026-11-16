import { Search } from 'lucide-react'
import type { RecorderModel } from '../../../features/browserRecorder/useBrowserRecorder'
import { METHOD_FILTERS, TYPE_FILTERS, typeFilterLabel } from '../../../features/browserRecorder/recorderTypes'
import * as S from '../../../features/browserRecorder/recorderStyles'
import { SelectionToolbar } from './SelectionToolbar'

export function FilterToolbar({ rec }: { rec: RecorderModel }) {
  return (
    <div style={S.filterBar}>
      <div style={S.row('8px', { flexWrap: 'wrap' })}>
        {/* Search filter */}
        <div style={{ position: 'relative', width: '180px' }}>
          <Search size={13} style={{ position: 'absolute', left: '8px', top: '7px', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Filter URL / path..."
            value={rec.searchText}
            onChange={(e) => rec.setSearchText(e.target.value)}
            style={S.searchInput}
          />
        </div>

        {/* Category / Type Filter Tabs */}
        <div style={S.pillGroup}>
          {TYPE_FILTERS.map((t) => (
            <button key={t} type="button" onClick={() => rec.setTypeFilter(t)} style={S.pill(rec.typeFilter === t)}>
              {typeFilterLabel(t)}
            </button>
          ))}
        </div>

        {/* Method filter buttons */}
        <div style={S.pillGroup}>
          {METHOD_FILTERS.map((m) => (
            <button key={m} type="button" onClick={() => rec.setMethodFilter(m)} style={S.pill(rec.methodFilter === m)}>
              {m}
            </button>
          ))}
        </div>

        {/* Smart Exclusion Checkboxes */}
        <label style={S.smallCheck}>
          <input type="checkbox" checked={rec.hideStatic} onChange={(e) => rec.setHideStatic(e.target.checked)} />
          <span>Hide Static (.js/.css/img)</span>
        </label>

        <label style={S.smallCheck}>
          <input type="checkbox" checked={rec.hideAnalytics} onChange={(e) => rec.setHideAnalytics(e.target.checked)} />
          <span>Hide Analytics</span>
        </label>
      </div>

      <SelectionToolbar rec={rec} />
    </div>
  )
}
