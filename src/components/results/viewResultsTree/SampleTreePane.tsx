import type { RefObject } from 'react'
import { CheckCircle2, ListFilter, XCircle } from 'lucide-react'
import type { JtlSample } from '../../../services/jmeterRunnerService'

interface SampleTreePaneProps {
  sampleListRef: RefObject<HTMLDivElement>
  onScroll: () => void
  filteredCount: number
  totalCount: number
  isReal: boolean
  virtualSampleRange: { offsetTop: number; totalHeight: number }
  visibleSamples: JtlSample[]
  selectedSampleId?: string
  newSampleIds: Set<string>
  onSelect: (id: string) => void
}

/** Left pane: JMeter Sample Tree List (virtualised). */
export function SampleTreePane({
  sampleListRef,
  onScroll,
  filteredCount,
  totalCount,
  isReal,
  virtualSampleRange,
  visibleSamples,
  selectedSampleId,
  newSampleIds,
  onSelect,
}: SampleTreePaneProps) {
  return (
          <div className="jmeter-vrt-tree-pane">
          <div className="vrt-pane-header">
            <ListFilter size={14} />
            <span>Sample List ({filteredCount}/{totalCount})</span>
          </div>

          <div ref={sampleListRef} className="vrt-sample-list" onScroll={onScroll}>
            {filteredCount === 0 ? (
              <div className={`vrt-empty-list ${isReal ? 'live-waiting' : ''}`}>
                {isReal ? 'Waiting for live samples from JMeter...' : 'No samples match your filters.'}
              </div>
            ) : (
              <div className="vrt-virtual-spacer" style={{ height: `${virtualSampleRange.totalHeight}px` }}>
                <div className="vrt-virtual-rows" style={{ transform: `translateY(${virtualSampleRange.offsetTop}px)` }}>
                  {visibleSamples.map((item) => {
                    const isSelected = item.id === selectedSampleId
                    const isNew = newSampleIds.has(item.id)
                    return (
                      <div
                        key={item.id}
                        className={`jmeter-tree-node ${isSelected ? 'selected' : ''} ${item.success ? 'success' : 'failed'} ${isNew ? 'new-sample' : ''}`}
                        onClick={() => onSelect(item.id)}
                      >
                        <div className="node-icon">
                          {item.success ? (
                            <CheckCircle2 size={15} className="icon-success" />
                          ) : (
                            <XCircle size={15} className="icon-failed" />
                          )}
                        </div>
                        <div className="node-label-group">
                          <span className="node-label" title={item.label}>
                            {item.label}
                          </span>
                        </div>
                        <div className="node-meta">
                          <span className={`node-code ${item.success ? 'code-200' : 'code-err'}`}>
                            {item.code}
                          </span>
                          <span className="node-elapsed">{item.elapsed} ms</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
  )
}
