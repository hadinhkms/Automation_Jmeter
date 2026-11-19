import { Sparkles, X } from 'lucide-react'
import type { TestPlanNode } from '../../models/jmeter'
import { templates } from './templateGallery/templates'
import { TemplateCard } from './templateGallery/TemplateCard'

interface TemplateGalleryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (testPlan: TestPlanNode, templateName: string) => void
}

export function TemplateGalleryModal({ isOpen, onClose, onSelectTemplate }: TemplateGalleryModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 980, width: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color="#f59e0b" />
            <h3>Enterprise JMeter Test Plan Template Gallery</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 18, lineHeight: 1.5 }}>
            Select a battle-tested industrial template to instantly scaffold complete Test Plans with optimal thread modeling, correlation, assertions, and reporting.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
            {templates.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} onClose={onClose} onSelectTemplate={onSelectTemplate} />
            ))}
          </div>
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
