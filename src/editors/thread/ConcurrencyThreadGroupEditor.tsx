import { useMemo } from 'react'
import { FormField, SelectField, Section } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { WorkloadCurvePreview } from './WorkloadCurvePreview'

export function ConcurrencyThreadGroupEditor({ node, updateProperties }: EditorProps) {
  const targetConcurrency = Number(node.properties.targetConcurrency ?? 50)
  const rampUpTime = Number(node.properties.rampUpTime ?? 60)
  const rampUpSteps = Math.max(1, Number(node.properties.rampUpSteps ?? 5))
  const holdRateTime = Number(node.properties.holdRateTime ?? 300)
  const unitStr = String(node.properties.timeUnit ?? 'S').toUpperCase() === 'M' ? 'min' : 'sec'

  const points = useMemo(() => {
    const pts: { time: number; vus: number }[] = [{ time: 0, vus: 0 }]
    const stepDuration = rampUpSteps > 0 ? rampUpTime / rampUpSteps : 0
    const vusPerStep = rampUpSteps > 0 ? targetConcurrency / rampUpSteps : 0

    let curTime = 0
    let curVus = 0
    for (let step = 1; step <= rampUpSteps; step++) {
      curTime += stepDuration
      curVus = Math.round(step * vusPerStep)
      pts.push({ time: Math.round(curTime), vus: curVus })
    }

    if (holdRateTime > 0) {
      curTime += holdRateTime
      pts.push({ time: Math.round(curTime), vus: targetConcurrency })
    }

    pts.push({ time: Math.round(curTime + 1), vus: 0 })
    return pts
  }, [targetConcurrency, rampUpTime, rampUpSteps, holdRateTime])

  return (
    <div className="editor-group-form">
      <Section title="Target Concurrency & Time Settings">
        <div className="form-grid-2">
          <FormField
            label="Target Concurrency (VUs)"
            type="number"
            min={1}
            value={Number(node.properties.targetConcurrency ?? 50)}
            onChange={(val) => updateProperties({ targetConcurrency: Number(val) })}
          />
          <SelectField
            label="Time Unit"
            value={String(node.properties.timeUnit ?? 'S')}
            options={[
              { value: 'S', label: 'Seconds (s)' },
              { value: 'M', label: 'Minutes (m)' },
            ]}
            onChange={(val) => updateProperties({ timeUnit: val })}
          />
        </div>

        <div className="form-grid-3" style={{ marginTop: 12 }}>
          <FormField
            label={`Ramp Up Time (${unitStr})`}
            type="number"
            min={0}
            value={Number(node.properties.rampUpTime ?? 60)}
            onChange={(val) => updateProperties({ rampUpTime: Number(val) })}
          />
          <FormField
            label="Ramp-Up Steps Count"
            type="number"
            min={1}
            value={Number(node.properties.rampUpSteps ?? 5)}
            onChange={(val) => updateProperties({ rampUpSteps: Number(val) })}
          />
          <FormField
            label={`Hold Target Rate Time (${unitStr})`}
            type="number"
            min={0}
            value={Number(node.properties.holdRateTime ?? 300)}
            onChange={(val) => updateProperties({ holdRateTime: Number(val) })}
          />
        </div>
      </Section>

      <Section title="Error & Iteration Handling">
        <div className="form-grid-2">
          <SelectField
            label="Action to be taken after a Sampler error"
            value={String(node.properties.onError ?? 'continue')}
            options={[
              { value: 'continue', label: 'Continue' },
              { value: 'startnextloop', label: 'Start Next Thread Loop' },
              { value: 'stopthread', label: 'Stop Thread' },
              { value: 'stoptest', label: 'Stop Test' },
              { value: 'stoptestnow', label: 'Stop Test Now' },
            ]}
            onChange={(val) => updateProperties({ onError: val })}
          />
          <FormField
            label="Iterations limit (Empty for unlimited)"
            placeholder="Unlimited"
            value={String(node.properties.iterations ?? '')}
            onChange={(val) => updateProperties({ iterations: val })}
          />
        </div>
      </Section>

      <WorkloadCurvePreview points={points} unit={unitStr} />
    </div>
  )
}
