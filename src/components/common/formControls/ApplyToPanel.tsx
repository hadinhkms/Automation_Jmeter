export function ApplyToPanel({
  value = 'main',
  variableName = '',
  onValueChange,
  onVariableNameChange,
}: {
  value: string
  variableName: string
  onValueChange: (value: string) => void
  onVariableNameChange: (variableName: string) => void
}) {
  const isMainAndSub = value === 'all' || value === 'main-and-sub'
  const isMain = value === 'main' || value === '' || (!isMainAndSub && value !== 'children' && value !== 'sub' && value !== 'variable')
  const isSub = value === 'children' || value === 'sub'
  const isVariable = value === 'variable'

  return (
    <fieldset className="editor-section apply-to-section">
      <legend>Apply to:</legend>
      <div className="apply-to-options">
        <label className="apply-to-radio">
          <input
            type="radio"
            name="applyToScope"
            value="all"
            checked={isMainAndSub}
            onChange={() => onValueChange('all')}
          />
          <span>Main sample and sub samples</span>
        </label>
        <label className="apply-to-radio">
          <input
            type="radio"
            name="applyToScope"
            value="main"
            checked={isMain}
            onChange={() => onValueChange('main')}
          />
          <span>Main sample only</span>
        </label>
        <label className="apply-to-radio">
          <input
            type="radio"
            name="applyToScope"
            value="children"
            checked={isSub}
            onChange={() => onValueChange('children')}
          />
          <span>Sub samples only</span>
        </label>
        <label className="apply-to-radio apply-to-variable-row">
          <input
            type="radio"
            name="applyToScope"
            value="variable"
            checked={isVariable}
            onChange={() => onValueChange('variable')}
          />
          <span>JMeter Variable Name to use</span>
          <input
            type="text"
            className="scope-variable-input"
            value={variableName}
            disabled={!isVariable}
            placeholder=""
            aria-label="JMeter Variable Name to use"
            onChange={(event) => onVariableNameChange(event.target.value)}
          />
        </label>
      </div>
    </fieldset>
  )
}
