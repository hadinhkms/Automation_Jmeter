import type { ReactNode } from 'react'

export type BadgeTone = 'version' | 'neutral' | 'installed' | 'upgrade'

const BADGE_COLORS: Record<BadgeTone, { background: string; color: string; fontSize: string }> = {
  version: { background: '#e0f2fe', color: '#0369a1', fontSize: '11px' },
  neutral: { background: '#f1f5f9', color: '#475569', fontSize: '11px' },
  installed: { background: '#dcfce7', color: '#15803d', fontSize: '10.5px' },
  upgrade: { background: '#fef08a', color: '#854d0e', fontSize: '11px' },
}

interface PluginListRowProps {
  name: string
  badge: ReactNode
  badgeTone: BadgeTone
  subtitle: string
  /** Long subtitles (id • category) are clipped with an ellipsis. */
  clipSubtitle?: boolean
  selected: boolean
  onSelect: () => void
}

/** One selectable row in the plugin list (installed / available / upgrades tabs). */
export function PluginListRow({ name, badge, badgeTone, subtitle, clipSubtitle = true, selected, onSelect }: PluginListRowProps) {
  const tone = BADGE_COLORS[badgeTone]
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer',
        background: selected ? '#f0f9ff' : 'transparent',
        borderLeft: selected ? '3px solid #0284c7' : '3px solid transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#0f172a' }}>{name}</span>
        <span style={{ ...tone, padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>{badge}</span>
      </div>
      <div style={clipSubtitle ? { fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : { fontSize: '11px', color: '#64748b' }}>
        {subtitle}
      </div>
    </div>
  )
}

export function PluginListEmpty({ children }: { children: ReactNode }) {
  return <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>{children}</div>
}
