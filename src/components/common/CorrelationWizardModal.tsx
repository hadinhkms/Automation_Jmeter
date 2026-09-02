import React, { useState } from 'react'
import {
  Sparkles,
  X,
  Link2,
  ArrowRight,
  ListFilter,
} from 'lucide-react'
import type { CorrelationCandidate } from '../../utils/correlationDetector'

interface CorrelationWizardModalProps {
  isOpen: boolean
  onClose: () => void
  candidates: CorrelationCandidate[]
  onApply: (selectedCandidates: CorrelationCandidate[]) => void
}

export function CorrelationWizardModal({
  isOpen,
  onClose,
  candidates: initialCandidates,
  onApply,
}: CorrelationWizardModalProps) {
  const [candidates, setCandidates] = useState<CorrelationCandidate[]>(initialCandidates)

  React.useEffect(() => {
    setCandidates(initialCandidates)
  }, [initialCandidates])

  if (!isOpen) return null

  const handleToggle = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    )
  }

  const handleNameChange = (id: string, newName: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, variableName: newName } : c))
    )
  }

  const handleToggleAll = (enabled: boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, enabled })))
  }

  const activeCount = candidates.filter((c) => c.enabled).length

  const handleApplyClick = () => {
    onApply(candidates.filter((c) => c.enabled))
    onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-container correlation-modal-container" style={{ maxWidth: '850px', width: '92vw' }}>
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Sparkles size={18} />
            </span>
            <div>
              <h2>Trình Tự Động Tương Quan Biến (Auto-Correlation Wizard)</h2>
              <p>Phát hiện tự động các mã Token, Session ID, và Khóa động để tự chèn Extractor và tham số hóa.</p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body" style={{ maxHeight: '68vh', overflowY: 'auto', padding: '16px 20px' }}>
          {candidates.length === 0 ? (
            <div className="correlation-empty-state" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <ListFilter size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <h4>Không phát hiện biến động tương quan</h4>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                Tất cả request có vẻ độc lập hoặc không truyền lại giá trị từ response của request trước.
              </p>
            </div>
          ) : (
            <>
              <div className="correlation-stats-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '13px' }}>
                  Đã phát hiện <strong style={{ color: 'var(--accent)' }}>{candidates.length}</strong> biến tương quan tiềm năng (Đang chọn: <strong>{activeCount}</strong>).
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-secondary-sm" onClick={() => handleToggleAll(true)}>Chọn tất cả</button>
                  <button type="button" className="btn-secondary-sm" onClick={() => handleToggleAll(false)}>Bỏ chọn</button>
                </div>
              </div>

              <div className="correlation-cards-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className={`correlation-card ${cand.enabled ? 'active' : 'disabled'}`}
                    style={{
                      border: `1px solid ${cand.enabled ? 'var(--accent)' : 'var(--line)'}`,
                      borderRadius: '8px',
                      padding: '14px',
                      background: cand.enabled ? 'color-mix(in srgb, var(--accent) 5%, var(--bg-card))' : 'rgba(0,0,0,0.1)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={cand.enabled}
                          onChange={() => handleToggle(cand.id)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>Tên biến JMeter:</span>
                          <input
                            type="text"
                            value={cand.variableName}
                            onChange={(e) => handleNameChange(cand.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--line)',
                              background: 'var(--bg-card)',
                              color: 'var(--accent)',
                              fontWeight: 700,
                              fontSize: '12px',
                              fontFamily: 'monospace',
                            }}
                          />
                          <span className={`badge-pill ${cand.confidence === 'HIGH' ? 'success' : 'warning'}`} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: cand.confidence === 'HIGH' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)', color: cand.confidence === 'HIGH' ? '#4ade80' : '#facc15' }}>
                            {cand.confidence === 'HIGH' ? 'Độ tin cậy cao' : 'Khớp từ khóa'}
                          </span>
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                            {cand.extractorType}
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Source & Extractor Info */}
                    <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--muted)', minWidth: '90px' }}>📤 Trích xuất từ:</span>
                        <strong style={{ color: 'var(--text)', wordBreak: 'break-all' }}>{cand.sourceRequestName}</strong>
                      </div>
                      {cand.jsonPath && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--muted)', minWidth: '90px' }}>🔍 JSONPath:</span>
                          <code style={{ color: '#38bdf8' }}>{cand.jsonPath}</code>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--muted)', minWidth: '90px' }}>🔑 Giá trị mẫu:</span>
                        <code style={{ color: '#a78bfa', wordBreak: 'break-all' }}>{cand.sampleValue}</code>
                      </div>
                    </div>

                    {/* Targets Preview */}
                    <div style={{ marginTop: '8px', paddingLeft: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowRight size={12} /> Áp dụng thay thế tự động vào <strong>{cand.targets.length}</strong> request phía sau:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {cand.targets.map((tgt, idx) => (
                          <div key={idx} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-subtle)' }}>
                            <Link2 size={11} style={{ color: 'var(--accent)' }} />
                            <span>{tgt.targetRequestName}</span>
                            <span style={{ color: 'var(--muted)' }}>({tgt.location}{tgt.field ? ` • ${tgt.field}` : ''})</span>
                            <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>➔ {tgt.replacementExpression}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <footer className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--line)' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Bỏ qua / Hủy
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleApplyClick}
            disabled={activeCount === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Sparkles size={16} />
            Áp dụng {activeCount} biến tương quan vào Test Plan
          </button>
        </footer>
      </div>
    </div>
  )
}
