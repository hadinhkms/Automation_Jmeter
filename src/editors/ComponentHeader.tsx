import type { TestPlanNode } from '../models/jmeter'
import { CheckboxField, TextAreaField } from '../components/common/FormControls'

export function ComponentHeader({
  node,
  onUpdateNode,
  onUpdateProperties,
}: {
  node: TestPlanNode
  onUpdateNode: (updates: Partial<TestPlanNode>) => void
  onUpdateProperties: (updates: Record<string, unknown>) => void
}) {
  return (
    <div className="component-header">
      <label className="header-name-field">
        <span>Name</span>
        <input
          value={node.name}
          aria-label="Component name"
          onChange={(event) => onUpdateNode({ name: event.target.value })}
          onBlur={(event) => {
            if (!event.currentTarget.value.trim()) onUpdateNode({ name: 'Untitled Component' })
          }}
        />
      </label>
      <TextAreaField
        label="Comments"
        value={String(node.properties.comments ?? '')}
        rows={2}
        onChange={(comments) => onUpdateProperties({ comments })}
      />
      <CheckboxField
        label="Enabled"
        checked={node.enabled}
        onChange={(enabled) => onUpdateNode({ enabled })}
      />
    </div>
  )
}
