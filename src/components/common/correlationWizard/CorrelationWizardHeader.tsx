import { Sparkles, X } from 'lucide-react'

export function CorrelationWizardHeader({ onClose }: { onClose: () => void }) {
  return (
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
  )
}
