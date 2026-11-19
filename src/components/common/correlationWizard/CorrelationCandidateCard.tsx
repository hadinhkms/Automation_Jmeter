import { Link2, ArrowRight } from 'lucide-react'
import type { CorrelationCandidate } from '../../../utils/correlationDetector'

interface CorrelationCandidateCardProps {
  cand: CorrelationCandidate
  onToggle: (id: string) => void
  onNameChange: (id: string, newName: string) => void
}

export function CorrelationCandidateCard({ cand, onToggle, onNameChange }: CorrelationCandidateCardProps) {
  return (
    <div
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
            onChange={() => onToggle(cand.id)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>Tên biến JMeter:</span>
            <input
              type="text"
              value={cand.variableName}
              onChange={(e) => onNameChange(cand.id, e.target.value)}
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
  )
}
