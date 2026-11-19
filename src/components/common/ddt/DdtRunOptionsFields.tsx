import type { DdtRunOptions } from './useDdtWizard'
import { SHARE_MODE_ALL, SHARE_MODE_GROUP, SHARE_MODE_THREAD } from '../../../utils/ddt/csvShareMode'

interface DdtRunOptionsFieldsProps {
  options: DdtRunOptions
  disabled: boolean
  onChange: (options: DdtRunOptions) => void
}

/** End-of-file and sharing behaviour of the generated CSV Data Set Config. */
export function DdtRunOptionsFields({ options, disabled, onChange }: DdtRunOptionsFieldsProps) {
  return (
    <div className="ddt-options">
      <label className="ddt-check">
        <input type="checkbox" checked={options.recycle} disabled={disabled} onChange={(e) => onChange({ ...options, recycle: e.target.checked })} />
        Recycle on EOF
      </label>
      <label className="ddt-check">
        <input type="checkbox" checked={options.stopThread} disabled={disabled} onChange={(e) => onChange({ ...options, stopThread: e.target.checked })} />
        Stop thread on EOF
      </label>
      <label className="ddt-select">
        Sharing
        <select
          value={options.sharingMode}
          disabled={disabled}
          // SAFETY: value comes from a select element whose option values are exactly this union
          onChange={(e) => onChange({ ...options, sharingMode: e.target.value as DdtRunOptions['sharingMode'] })}
        >
          <option value={SHARE_MODE_ALL}>All threads</option>
          <option value={SHARE_MODE_GROUP}>Current thread group</option>
          <option value={SHARE_MODE_THREAD}>Current thread</option>
        </select>
      </label>
    </div>
  )
}
