import { useState, useRef } from 'react'
import { useJMeterStore } from '../../store/jmeterStore'
import { LiveMetricsDashboard } from './LiveMetricsDashboard'
import type { SlaThresholds } from '../../models/jmeter'
import { copyTextToClipboard } from '../../utils/clipboard'
import type { ViewResultsTreeProps } from './viewResultsTree/types'
import { useSampleFilters } from './viewResultsTree/useSampleFilters'
import { useSampleTracking } from './viewResultsTree/useSampleTracking'
import { useSampleDetails } from './viewResultsTree/useSampleDetails'
import { useVirtualSampleList } from './viewResultsTree/useVirtualSampleList'
import { useDetailTabs } from './viewResultsTree/useDetailTabs'
import { useJtlImport } from './viewResultsTree/useJtlImport'
import { VrtToolbarTopRow } from './viewResultsTree/VrtToolbarTopRow'
import { VrtFilterRow } from './viewResultsTree/VrtFilterRow'
import { SampleTreePane } from './viewResultsTree/SampleTreePane'
import { DetailPane } from './viewResultsTree/DetailPane'
import { JtlDropZone } from './viewResultsTree/JtlDropZone'

export function ViewResultsTree({ samples, isReal = false, activeRunId }: ViewResultsTreeProps) {
  const store = useJMeterStore()
  const [viewMode, setViewMode] = useState<'tree' | 'dashboard'>('tree')
  const [selectedId, setSelectedId] = useState<string>(samples[0]?.id || '')
  const filters = useSampleFilters(samples)
  const { filteredSamples, autoScroll } = filters
  const [copied, setCopied] = useState(false)

  const sampleListRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleImportJtlFile = useJtlImport()

  const newSampleIds = useSampleTracking(samples, selectedId, setSelectedId, autoScroll, sampleListRef)
  const details = useSampleDetails(samples, filteredSamples, selectedId, store.testPlan)
  const { selectedSample } = details
  const { virtualSampleRange, visibleSamples, handleSampleListScroll } = useVirtualSampleList(
    filteredSamples,
    selectedSample,
    autoScroll,
    sampleListRef
  )
  const tabs = useDetailTabs(details.isSelectedHttpRequest)

  const totalCount = samples.length
  const successCount = samples.filter((s) => s.success).length
  const errorCount = totalCount - successCount

  const handleCopy = async (text: string) => {
    if (!text) return
    if (await copyTextToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <JtlDropZone fileInputRef={fileInputRef} onImportFile={handleImportJtlFile}>
      {/* Top JMeter Toolbar / Filter Bar */}
      <div className="jmeter-vrt-toolbar">
        <VrtToolbarTopRow
          activeRunId={activeRunId}
          isReal={isReal}
          fileInputRef={fileInputRef}
          viewMode={viewMode}
          setViewMode={setViewMode}
          totalCount={totalCount}
          successCount={successCount}
          errorCount={errorCount}
          filters={filters}
        />
        <VrtFilterRow filters={filters} />
      </div>

      {/* Main Content Area: Left Sample List + Right Details OR Live APM Dashboard */}
      {viewMode === 'dashboard' ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <LiveMetricsDashboard
            samples={samples}
            summaryRows={store.realSummaryRows}
            aggregateRows={store.realAggregateRows}
            runMetrics={store.metrics}
            // SAFETY: test-plan property is written only by its own settings editor with this shape; undefined when unset
            slaThresholds={store.testPlan.properties.slaThresholds as SlaThresholds | undefined}
            isRunning={store.runState === 'RUNNING'}
          />
        </div>
      ) : (
        <div className="jmeter-vrt-body">
          <SampleTreePane
            sampleListRef={sampleListRef}
            onScroll={handleSampleListScroll}
            filteredCount={filteredSamples.length}
            totalCount={totalCount}
            isReal={isReal}
            virtualSampleRange={virtualSampleRange}
            visibleSamples={visibleSamples}
            selectedSampleId={selectedSample?.id}
            newSampleIds={newSampleIds}
            onSelect={setSelectedId}
          />
          <DetailPane details={details} tabs={tabs} copied={copied} onCopy={handleCopy} />
        </div>
      )}
    </JtlDropZone>
  )
}
