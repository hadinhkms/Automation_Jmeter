import { useMemo } from 'react'
import type { TableRow } from '../../models/jmeter'
import { Section } from '../../components/common/FormControls'
import { EditableTable } from '../../components/common/EditableTable'
import type { EditorProps } from '../editorUtils'
import { WorkloadCurvePreview } from './WorkloadCurvePreview'

const defaultUltimateScheduleRows: TableRow[] = [
  { startThreads: '100', initialDelay: '0', startupTime: '30', holdLoadTime: '300', shutdownTime: '10' },
]

export function UltimateThreadGroupEditor({ node, updateProperties }: EditorProps) {
  // SAFETY: property is written only by its editor as TableRow[]; missing value falls back to the default
  const rawRows = (node.properties.scheduleRows as TableRow[]) || defaultUltimateScheduleRows

  const points = useMemo(() => {
    let maxT = 0
    rawRows.forEach((r) => {
      const delay = Number(r.initialDelay || 0)
      const ramp = Number(r.startupTime || 0)
      const hold = Number(r.holdLoadTime || 0)
      const shut = Number(r.shutdownTime || 0)
      maxT = Math.max(maxT, delay + ramp + hold + shut)
    })
    maxT = Math.max(maxT, 10)

    const step = maxT / 50
    const pts: { time: number; vus: number }[] = []

    for (let t = 0; t <= maxT; t += step) {
      let totalVus = 0
      rawRows.forEach((r) => {
        const vus = Number(r.startThreads || 0)
        const delay = Number(r.initialDelay || 0)
        const ramp = Number(r.startupTime || 0)
        const hold = Number(r.holdLoadTime || 0)
        const shut = Number(r.shutdownTime || 0)

        if (t < delay) {
          totalVus += 0
        } else if (t < delay + ramp) {
          const ratio = ramp > 0 ? (t - delay) / ramp : 1
          totalVus += Math.round(vus * ratio)
        } else if (t < delay + ramp + hold) {
          totalVus += vus
        } else if (t < delay + ramp + hold + shut) {
          const ratio = shut > 0 ? (delay + ramp + hold + shut - t) / shut : 0
          totalVus += Math.round(vus * ratio)
        }
      })
      pts.push({ time: Math.round(t), vus: totalVus })
    }

    return pts
  }, [rawRows])

  return (
    <div className="editor-group-form">
      <Section title="Threads Schedule Table">
        <EditableTable
          columns={[
            { key: 'startThreads', label: 'Start Threads', minWidth: 100 },
            { key: 'initialDelay', label: 'Initial Delay (s)', minWidth: 110 },
            { key: 'startupTime', label: 'Startup Time (s)', minWidth: 110 },
            { key: 'holdLoadTime', label: 'Hold Load (s)', minWidth: 110 },
            { key: 'shutdownTime', label: 'Shutdown (s)', minWidth: 100 },
          ]}
          rows={rawRows}
          newRow={{ startThreads: '100', initialDelay: '0', startupTime: '30', holdLoadTime: '300', shutdownTime: '10' }}
          onChange={(rows) => updateProperties({ scheduleRows: rows })}
        />
      </Section>

      <WorkloadCurvePreview points={points} unit="s" />
    </div>
  )
}
