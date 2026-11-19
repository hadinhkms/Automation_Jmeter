import { useMemo } from 'react'
import { FormField, Section } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { WorkloadCurvePreview } from './WorkloadCurvePreview'
import { buildSteppingPoints } from './steppingPoints'

export function SteppingThreadGroupEditor({ node, updateProperties }: EditorProps) {
  const numThreads = Number(node.properties.numThreads ?? 100)
  const firstWait = Number(node.properties.firstWaitSeconds ?? 0)
  const initialThreads = Number(node.properties.initialThreads ?? 10)
  const thenAddThreads = Math.max(1, Number(node.properties.thenAddThreads ?? 10))
  const everySeconds = Math.max(1, Number(node.properties.everySeconds ?? 30))
  const rampUpSeconds = Number(node.properties.rampUpSeconds ?? 5)
  const holdSeconds = Number(node.properties.holdSeconds ?? 300)
  const thenStopThreads = Math.max(1, Number(node.properties.thenStopThreads ?? 10))
  const stopEverySeconds = Math.max(1, Number(node.properties.stopEverySeconds ?? 5))

  const points = useMemo(
    () => buildSteppingPoints({ numThreads, firstWait, initialThreads, thenAddThreads, everySeconds, rampUpSeconds, holdSeconds, thenStopThreads, stopEverySeconds }),
    [numThreads, firstWait, initialThreads, thenAddThreads, everySeconds, rampUpSeconds, holdSeconds, thenStopThreads, stopEverySeconds],
  )

  return (
    <div className="editor-group-form">
      <Section title="Thread Schedule Parameters">
        <div className="form-grid-2">
          <FormField
            label="Total Virtual Users (Threads)"
            type="number"
            min={1}
            value={Number(node.properties.numThreads ?? 100)}
            onChange={(val) => updateProperties({ numThreads: Number(val) })}
          />
          <FormField
            label="First wait before start (sec)"
            type="number"
            min={0}
            value={Number(node.properties.firstWaitSeconds ?? 0)}
            onChange={(val) => updateProperties({ firstWaitSeconds: Number(val) })}
          />
        </div>

        <div className="form-grid-3" style={{ marginTop: 12 }}>
          <FormField
            label="Start initial users"
            type="number"
            min={0}
            value={Number(node.properties.initialThreads ?? 10)}
            onChange={(val) => updateProperties({ initialThreads: Number(val) })}
          />
          <FormField
            label="Then add users count"
            type="number"
            min={1}
            value={Number(node.properties.thenAddThreads ?? 10)}
            onChange={(val) => updateProperties({ thenAddThreads: Number(val) })}
          />
          <FormField
            label="Every period (sec)"
            type="number"
            min={1}
            value={Number(node.properties.everySeconds ?? 30)}
            onChange={(val) => updateProperties({ everySeconds: Number(val) })}
          />
        </div>

        <div className="form-grid-3" style={{ marginTop: 12 }}>
          <FormField
            label="Ramp-up duration (sec)"
            type="number"
            min={0}
            value={Number(node.properties.rampUpSeconds ?? 5)}
            onChange={(val) => updateProperties({ rampUpSeconds: Number(val) })}
          />
          <FormField
            label="Flight / Hold duration (sec)"
            type="number"
            min={0}
            value={Number(node.properties.holdSeconds ?? 300)}
            onChange={(val) => updateProperties({ holdSeconds: Number(val) })}
          />
          <FormField
            label="Stop users count"
            type="number"
            min={1}
            value={Number(node.properties.thenStopThreads ?? 10)}
            onChange={(val) => updateProperties({ thenStopThreads: Number(val) })}
          />
        </div>
      </Section>

      <WorkloadCurvePreview points={points} unit="s" />
    </div>
  )
}
