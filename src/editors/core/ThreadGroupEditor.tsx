import { CheckboxField, FormField, RadioGroup, Section } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { boolProp, numberProp, textProp } from '../editorUtils'

export function ThreadGroupEditor({ node, updateProperties }: EditorProps) {
  const threads = numberProp(node, 'threads', 1)
  const rampUp = numberProp(node, 'rampUp')
  const loops = numberProp(node, 'loops', 1)
  const duration = numberProp(node, 'duration')
  const startupDelay = numberProp(node, 'startupDelay')
  const scheduler = boolProp(node, 'scheduler')
  const numeric = (key: string) => (value: string) => updateProperties({ [key]: value === '' ? '' : Number(value) })

  return (
    <>
      <Section title="Action to be taken after a Sampler error">
        <RadioGroup
          legend="Sampler error action"
          value={textProp(node, 'onError', 'continue')}
          onChange={(onError) => updateProperties({ onError })}
          options={[
            { value: 'continue', label: 'Continue' },
            { value: 'next-loop', label: 'Start Next Thread Loop' },
            { value: 'stop-thread', label: 'Stop Thread' },
            { value: 'stop-test', label: 'Stop Test' },
            { value: 'stop-now', label: 'Stop Test Now' },
          ]}
        />
      </Section>
      <Section title="Thread Properties">
        <div className="form-grid three-columns">
          <FormField label="Number of Threads (users)" type="number" min={1} value={textProp(node, 'threads', '1')} error={threads < 1 ? 'Must be at least 1' : undefined} onChange={numeric('threads')} />
          <FormField label="Ramp-up Period (seconds)" type="number" min={0} value={textProp(node, 'rampUp', '0')} error={rampUp < 0 ? 'Cannot be negative' : undefined} onChange={numeric('rampUp')} />
          <FormField label="Loop Count" type="number" min={1} value={textProp(node, 'loops', '1')} error={loops < 1 ? 'Must be at least 1' : undefined} onChange={numeric('loops')} />
        </div>
        <div className="checkbox-stack inline-checks">
          <CheckboxField label="Same user on each iteration" checked={boolProp(node, 'sameUser', true)} onChange={(sameUser) => updateProperties({ sameUser })} />
          <CheckboxField label="Delay Thread creation until needed" checked={boolProp(node, 'delayedStart')} onChange={(delayedStart) => updateProperties({ delayedStart })} />
          <CheckboxField label="Scheduler" checked={scheduler} onChange={(value) => updateProperties({ scheduler: value })} />
        </div>
        {scheduler ? (
          <div className="form-grid two-columns scheduler-fields">
            <FormField label="Duration (seconds)" type="number" min={0} value={textProp(node, 'duration', '0')} error={duration < 0 ? 'Cannot be negative' : undefined} onChange={numeric('duration')} />
            <FormField label="Startup Delay (seconds)" type="number" min={0} value={textProp(node, 'startupDelay', '0')} error={startupDelay < 0 ? 'Cannot be negative' : undefined} onChange={numeric('startupDelay')} />
          </div>
        ) : null}
      </Section>
    </>
  )
}
