import { Rocket } from 'lucide-react'
import type { TestPlanNode } from '../../../models/jmeter'
import type { TemplateItem } from '../../../models/templateGallery'

interface TemplateCardProps {
  tpl: TemplateItem
  onClose: () => void
  onSelectTemplate: (testPlan: TestPlanNode, templateName: string) => void
}

export function TemplateCard({ tpl, onClose, onSelectTemplate }: TemplateCardProps) {
  const Icon = tpl.icon
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
      className="template-card"
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} color="#2563eb" />
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              background: '#fef3c7',
              color: '#b45309',
              textTransform: 'uppercase',
            }}
          >
            {tpl.badge}
          </span>
        </div>

        <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{tpl.title}</h4>
        <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.45, margin: '0 0 12px 0' }}>
          {tpl.description}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {tpl.tags.map((tag, idx) => (
            <span
              key={idx}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: '#e2e8f0',
                color: '#334155',
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => {
          const plan = tpl.buildPlan()
          onSelectTemplate(plan, tpl.title)
          onClose()
        }}
        style={{ width: '100%', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        <Rocket size={14} /> Use This Template
      </button>
    </div>
  )
}
