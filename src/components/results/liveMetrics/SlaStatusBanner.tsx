import { CheckCircle2, XCircle } from 'lucide-react'
import type { SlaEvaluationResult } from '../../../models/jmeter'

/** SLA Status Banner */
export function SlaStatusBanner({ slaResult }: { slaResult: SlaEvaluationResult }) {
  return (
        <div
          style={{
            background: slaResult.passed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${slaResult.passed ? '#10b981' : '#ef4444'}`,
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {slaResult.passed ? <CheckCircle2 size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />}
            <div>
              <strong style={{ color: slaResult.passed ? '#10b981' : '#ef4444', fontSize: 14 }}>
                {slaResult.passed ? 'SLA Quality Gates: PASSED' : 'SLA Quality Gates: FAILED (Thresholds Breached)'}
              </strong>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{slaResult.summaryText}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {slaResult.rules.map((r, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: r.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.25)',
                  color: r.passed ? '#34d399' : '#f87171',
                  fontWeight: 600,
                }}
              >
                {r.name}: {r.actual}{r.unit} ({r.operator}{r.target})
              </span>
            ))}
          </div>
        </div>
  )
}
