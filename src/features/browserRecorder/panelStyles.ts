import type { CSSProperties } from 'react'

type St = CSSProperties
const BORDER = '1px solid var(--border-color, #334155)'
const CODE_BOX = { background: '#090d16', border: '1px solid #1e293b' }

export const mainArea: St = { flex: 1, display: 'flex', overflow: 'hidden' }

export const tableColumn: St = {
  flex: '1 1 58%', display: 'flex', flexDirection: 'column', borderRight: BORDER, overflow: 'hidden',
}

export const emptyState: St = {
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '40px 20px', color: 'var(--text-muted, #94a3b8)', textAlign: 'center',
}

export const emptyIcon: St = { opacity: 0.4, marginBottom: '12px', color: '#818cf8' }
export const emptyTitle: St = { margin: '0 0 6px 0', color: '#e2e8f0', fontSize: '0.95rem' }
export const emptyText: St = { margin: 0, fontSize: '0.8rem', maxWidth: '360px', lineHeight: 1.5 }

export const table: St = { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }

export const thead: St = {
  position: 'sticky', top: 0, background: 'var(--bg-secondary, #1e293b)', zIndex: 2, borderBottom: BORDER,
}

export const th = (width: string | undefined, textAlign: 'left' | 'center' | 'right'): St =>
  width ? { width, padding: '6px 8px', textAlign } : { padding: '6px 8px', textAlign }

export const tableRow = (inspected: boolean, idx: number): St => ({
  cursor: 'pointer',
  background: inspected ? 'rgba(99, 102, 241, 0.15)' : idx % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'transparent',
  borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
})

export const cell: St = { padding: '6px 8px' }

export const methodTag = (color: string): St => ({
  fontSize: '0.7rem', fontWeight: 700, color, padding: '1px 5px', borderRadius: '3px',
  background: 'rgba(255, 255, 255, 0.05)',
})

export const pathCell: St = {
  padding: '6px 8px', maxWidth: '270px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}

export const pathText: St = { fontFamily: 'monospace', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis' }
export const txCell: St = { padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

export const timeCell: St = {
  padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8',
}

export const inspectorColumn: St = {
  flex: '1 1 42%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary, #0f172a)',
  overflow: 'hidden',
}

export const inspectorHeader: St = {
  padding: '10px 14px', background: 'var(--bg-secondary, #1e293b)', borderBottom: BORDER,
  display: 'flex', flexDirection: 'column', gap: '6px',
}

export const inspMethod: St = {
  fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '3px',
  background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8',
}

export const inspUrl: St = {
  fontSize: '0.78rem', fontFamily: 'monospace', color: '#38bdf8', overflow: 'hidden',
  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}

export const sensitiveBadge: St = {
  fontSize: '0.68rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24',
  border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1px 6px', borderRadius: '4px',
  display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0,
}

export const inspTab = (active: boolean): St => ({
  border: 'none', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 500, borderRadius: '4px', cursor: 'pointer',
  background: active ? 'var(--accent, #6366f1)' : 'rgba(255, 255, 255, 0.05)',
  color: active ? '#ffffff' : '#94a3b8', textTransform: 'capitalize',
})

export const copyBtn: St = {
  position: 'absolute', right: '8px', top: '8px', background: 'rgba(255, 255, 255, 0.1)', border: 'none',
  borderRadius: '4px', color: '#94a3b8', padding: '3px 6px', cursor: 'pointer', display: 'flex',
  alignItems: 'center', gap: '4px', fontSize: '0.7rem',
}

export const codePre = (fontSize: string, maxHeight: string): St => ({
  margin: 0, fontSize, fontFamily: 'monospace', color: '#cbd5e1', ...CODE_BOX, padding: '10px',
  borderRadius: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight, overflowY: 'auto',
})

export const kvRow: St = {
  display: 'flex', gap: '8px', fontSize: '0.74rem', fontFamily: 'monospace', ...CODE_BOX,
  padding: '4px 8px', borderRadius: '4px',
}

export const kvValue: St = { color: '#cbd5e1', wordBreak: 'break-all' }
export const column = (gap: string): St => ({ display: 'flex', flexDirection: 'column', gap })
export const emptyNote: St = { fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: '10px 0' }

export const sensitiveIntro: St = {
  padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)',
  borderRadius: '6px', fontSize: '0.78rem', color: '#fbbf24',
}

export const sensitiveItem: St = {
  padding: '4px 8px', ...CODE_BOX, borderRadius: '4px', fontSize: '0.74rem', fontFamily: 'monospace', color: '#f87171',
}

export const noSelection: St = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem',
}

export const footer: St = {
  padding: '12px 20px', background: 'var(--bg-secondary, #1e293b)', borderTop: BORDER,
  display: 'flex', flexDirection: 'column', gap: '10px',
}

export const targetSelect: St = {
  height: '30px', padding: '0 8px', fontSize: '0.78rem', borderRadius: '6px', background: 'var(--input-bg, #0f172a)',
  color: '#f8fafc', border: BORDER, maxWidth: '220px',
}

export const correlateBtn = (enabled: boolean): St => ({
  height: '32px', padding: '0 12px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center',
  gap: '6px', background: enabled ? 'rgba(99, 102, 241, 0.15)' : '#1e293b', border: '1px solid',
  borderColor: enabled ? '#6366f1' : '#334155', color: enabled ? '#a5b4fc' : '#64748b', borderRadius: '6px',
  cursor: enabled ? 'pointer' : 'not-allowed',
})

export const importBtn = (enabled: boolean): St => ({
  height: '32px', padding: '0 16px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center',
  gap: '6px', background: enabled ? 'var(--accent, #6366f1)' : '#334155', cursor: enabled ? 'pointer' : 'not-allowed',
})

export const securityRow: St = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '6px',
  borderTop: '1px solid rgba(51, 65, 85, 0.5)', fontSize: '0.76rem', color: '#94a3b8', flexWrap: 'wrap',
}
