import * as P from '../../../features/browserRecorder/panelStyles'

interface KeyValueListProps {
  items: Array<{ name: string; value: string }>
  keyColor: string
}

/** Vertical list of `name: value` rows (headers, query params, post params). */
export function KeyValueList({ items, keyColor }: KeyValueListProps) {
  return (
    <div style={P.column('6px')}>
      {items.map((p, i) => (
        <div key={i} style={P.kvRow}>
          <strong style={{ color: keyColor, minWidth: '110px' }}>{p.name}:</strong>
          <span style={P.kvValue}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}
