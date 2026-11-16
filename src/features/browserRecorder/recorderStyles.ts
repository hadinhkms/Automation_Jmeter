import type { CSSProperties } from 'react'

type St = CSSProperties
const BORDER = '1px solid var(--border-color, #334155)'
const ACCENT = 'var(--accent, #6366f1)'

export const row = (gap: string, extra: St = {}): St => ({ display: 'flex', alignItems: 'center', gap, ...extra })

export const modalContainer: St = {
  maxWidth: '1200px', width: '96%', height: '90vh', maxHeight: '940px', display: 'flex', flexDirection: 'column',
  overflow: 'hidden', borderRadius: '12px', background: 'var(--bg-primary, #0f172a)', border: BORDER,
  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
}

export const header: St = {
  padding: '12px 20px', background: 'var(--bg-secondary, #1e293b)', borderBottom: BORDER,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}

export const iconBox = (rec: boolean): St => ({
  width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: rec ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.15)', color: rec ? '#ef4444' : '#818cf8',
})

export const title: St = { margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }

export const liveBadge: St = {
  fontSize: '0.72rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.25)', color: '#f87171',
  border: '1px solid rgba(239, 68, 68, 0.4)', padding: '2px 8px', borderRadius: '12px',
  display: 'flex', alignItems: 'center', gap: '4px',
}

export const liveDot: St = {
  width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite',
}

export const idleBadge: St = {
  fontSize: '0.72rem', fontWeight: 500, background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8',
  padding: '2px 8px', borderRadius: '12px',
}

export const subtitle: St = { margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }

export const tabGroup: St = {
  display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '3px', borderRadius: '8px', border: BORDER,
}

export const modeTab = (active: boolean): St => ({
  padding: '5px 12px', fontSize: '0.8rem', fontWeight: 500, borderRadius: '6px', border: 'none',
  background: active ? ACCENT : 'transparent', color: active ? '#ffffff' : '#94a3b8',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
})

export const closeBtn: St = { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }

export const errorBar: St = {
  padding: '8px 16px', background: 'rgba(239, 68, 68, 0.15)', borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
  color: '#f87171', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}

export const controlsBar: St = {
  padding: '12px 20px', background: 'var(--bg-secondary, #1e293b)', borderBottom: BORDER,
  display: 'flex', flexDirection: 'column', gap: '10px',
}

export const urlInput: St = {
  width: '100%', paddingLeft: '32px', fontSize: '0.84rem', background: 'var(--input-bg, #0f172a)',
  color: '#f8fafc', border: BORDER, borderRadius: '6px', height: '34px',
}

export const browserSelect: St = {
  height: '34px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '6px',
  background: 'var(--input-bg, #0f172a)', color: '#f8fafc', border: BORDER, minWidth: '150px',
}

export const autoSplitLabel = (rec: boolean): St => ({
  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#cbd5e1',
  cursor: rec ? 'not-allowed' : 'pointer', background: 'rgba(15, 23, 42, 0.6)', padding: '0 10px',
  borderRadius: '6px', border: BORDER, height: '34px', boxSizing: 'border-box',
})

const recBtnBase: St = {
  height: '34px', padding: '0 16px', fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center',
  gap: '6px', border: 'none', borderRadius: '6px', color: '#ffffff',
}

export const startBtn = (starting: boolean): St => ({
  ...recBtnBase, background: '#ef4444', cursor: starting ? 'not-allowed' : 'pointer',
  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
})

export const stopBtn: St = { ...recBtnBase, background: '#dc2626', cursor: 'pointer' }

export const clearBtn: St = {
  height: '34px', padding: '0 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px',
}

export const harPickBtn: St = {
  height: '34px', padding: '0 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px',
}

export const stepperBar: St = {
  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px',
  background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)',
}

export const stepChip: St = {
  fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)',
  padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace',
}

export const stepInput: St = {
  flex: 1, height: '28px', padding: '0 8px', fontSize: '0.8rem', background: 'var(--input-bg, #0f172a)',
  border: BORDER, borderRadius: '4px', color: '#f8fafc',
}

export const stepBtn: St = {
  height: '28px', padding: '0 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px',
}

export const filterBar: St = {
  padding: '8px 20px', background: 'rgba(15, 23, 42, 0.7)', borderBottom: BORDER, display: 'flex',
  alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
}

export const searchInput: St = {
  width: '100%', height: '26px', paddingLeft: '26px', fontSize: '0.76rem', background: 'var(--input-bg, #1e293b)',
  border: BORDER, borderRadius: '4px', color: '#f8fafc', boxSizing: 'border-box',
}

export const pillGroup: St = {
  display: 'flex', gap: '2px', background: 'var(--input-bg, #1e293b)', padding: '2px', borderRadius: '4px',
}

export const pill = (active: boolean): St => ({
  border: 'none', padding: '2px 7px', fontSize: '0.72rem', fontWeight: 600, borderRadius: '3px', cursor: 'pointer',
  background: active ? ACCENT : 'transparent', color: active ? '#ffffff' : '#94a3b8',
})

export const smallCheck: St = row('5px', { fontSize: '0.76rem', cursor: 'pointer', color: '#cbd5e1' })

export const autoGroupBtn: St = {
  fontSize: '0.72rem', padding: '2px 9px', height: '24px', display: 'flex', alignItems: 'center', gap: '4px',
  color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)',
}

export const batchInput: St = {
  height: '24px', padding: '0 6px', fontSize: '0.72rem', background: 'var(--input-bg, #0f172a)',
  border: BORDER, borderRadius: '4px', color: '#f8fafc', width: '120px',
}

export const tinyBtn = (gap: string): St => ({
  fontSize: '0.72rem', padding: '2px 8px', height: '24px', display: 'flex', alignItems: 'center', gap,
})
