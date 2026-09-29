interface PostmanImportOptionsProps {
  threadGroups: Array<{ id: string; name: string }>
  targetGroupId: string
  onSelectTargetGroup: (id: string) => void
  autoConvertVars: boolean
  onToggleAutoConvertVars: (val: boolean) => void
  generateHeaderManager: boolean
  onToggleGenerateHeaderManager: (val: boolean) => void
}

export function PostmanImportOptions({
  threadGroups,
  targetGroupId,
  onSelectTargetGroup,
  autoConvertVars,
  onToggleAutoConvertVars,
  generateHeaderManager,
  onToggleGenerateHeaderManager,
}: PostmanImportOptionsProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 12,
        background: 'rgba(0, 0, 0, 0.15)',
        borderRadius: 6,
        border: '1px solid var(--border-color, #334155)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #94a3b8)', minWidth: 130 }}>
          Target Thread Group:
        </label>
        <select
          value={targetGroupId}
          onChange={(e) => onSelectTargetGroup(e.target.value)}
          style={{
            flex: 1,
            padding: '5px 8px',
            borderRadius: 4,
            border: '1px solid var(--border-color, #475569)',
            background: 'var(--bg-primary, #0f172a)',
            color: 'var(--text-color, #e2e8f0)',
            fontSize: 12,
          }}
        >
          {threadGroups.length === 0 ? (
            <option value="">(No Thread Groups found – attach to Test Plan)</option>
          ) : (
            threadGroups.map((tg) => (
              <option key={tg.id} value={tg.id}>
                {tg.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoConvertVars}
            onChange={(e) => onToggleAutoConvertVars(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ color: 'var(--text-color, #e2e8f0)' }}>
            Auto-convert Postman <code style={{ color: '#60a5fa' }}>{'{{var}}'}</code> to JMeter <code style={{ color: '#4ade80' }}>{'${var}'}</code>
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={generateHeaderManager}
            onChange={(e) => onToggleGenerateHeaderManager(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ color: 'var(--text-color, #e2e8f0)' }}>
            Generate HTTPHeaderManager for headers & tokens
          </span>
        </label>
      </div>
    </div>
  )
}
