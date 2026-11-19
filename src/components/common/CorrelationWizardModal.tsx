import React, { useState } from 'react'
import { Sparkles, ListFilter } from 'lucide-react'
import type { CorrelationCandidate } from '../../utils/correlationDetector'
import { CorrelationWizardHeader } from './correlationWizard/CorrelationWizardHeader'
import { CorrelationCandidateCard } from './correlationWizard/CorrelationCandidateCard'


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
        <CorrelationWizardHeader onClose={onClose} />

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
                  <CorrelationCandidateCard
                    key={cand.id}
                    cand={cand}
                    onToggle={handleToggle}
                    onNameChange={handleNameChange}
                  />
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
