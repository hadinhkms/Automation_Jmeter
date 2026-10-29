import { useMemo } from 'react'
import { X, Activity, Clock, Users, Zap } from 'lucide-react'
import type { TestPlanNode } from '../../models/jmeter'
import { WorkloadCurvePreview } from '../../editors/ThreadEditors'
import { extractThreadGroupCurves, computeCompositeCurve } from '../../utils/workloadUtils'

interface WorkloadGraphModalProps {
  isOpen: boolean
  onClose: () => void
  testPlan: TestPlanNode
}

export function WorkloadGraphModal({ isOpen, onClose, testPlan }: WorkloadGraphModalProps) {
  const curves = useMemo(() => (isOpen ? extractThreadGroupCurves(testPlan) : []), [isOpen, testPlan])
  const compositeCurve = useMemo(() => (isOpen ? computeCompositeCurve(curves) : []), [isOpen, curves])

  if (!isOpen) return null

  const maxTotalVus = Math.max(...compositeCurve.map((p) => p.vus), 0)
  const totalDuration = Math.max(...compositeCurve.map((p) => p.time), 0)

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 880, width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} color="#3b82f6" />
            <h3>Workload Curve & Concurrency Profile</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                <Users size={14} /> Peak Concurrency
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1d4ed8', marginTop: 4 }}>
                {maxTotalVus} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>VUs</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                <Clock size={14} /> Total Duration
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#059669', marginTop: 4 }}>
                {totalDuration} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>sec</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                <Zap size={14} /> Active Thread Groups
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706', marginTop: 4 }}>
                {curves.length} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>Groups</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Combined System Workload Curve</h4>
            <WorkloadCurvePreview points={compositeCurve} unit="s" height={220} />
          </div>

          {curves.length > 1 && (
            <div>
              <h4 style={{ margin: '18px 0 10px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Individual Thread Group Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {curves.map((c, i) => (
                  <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      <span>{c.name}</span>
                      <span style={{ fontSize: 11, color: '#334155', background: '#e2e8f0', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                        {c.type}
                      </span>
                    </div>
                    <WorkloadCurvePreview points={c.points} unit="s" height={130} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
