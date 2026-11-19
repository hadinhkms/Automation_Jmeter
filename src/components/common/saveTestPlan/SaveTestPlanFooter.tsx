import { Play, Download } from 'lucide-react'

interface SaveTestPlanFooterProps {
  isPromptBeforeRun: boolean
  isSaving: boolean
  onClose: () => void
  onRunWithoutSaving?: () => void
  onSave: (andRun: boolean) => void
}

export function SaveTestPlanFooter({
  isPromptBeforeRun,
  isSaving,
  onClose,
  onRunWithoutSaving,
  onSave,
}: SaveTestPlanFooterProps) {
  return (
    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
      {isPromptBeforeRun ? (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            onClose()
            if (onRunWithoutSaving) onRunWithoutSaving()
          }}
          title="Chạy trực tiếp mà không lưu thành file JMX"
        >
          <span>Chạy không lưu</span>
        </button>
      ) : (
        <div />
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Hủy
        </button>

        {isPromptBeforeRun ? (
          <button
            type="button"
            className="btn btn-primary btn-run-save"
            disabled={isSaving}
            onClick={() => onSave(true)}
          >
            <Play size={14} fill="currentColor" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu & Chạy Test'}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={isSaving}
            onClick={() => onSave(false)}
          >
            <Download size={14} />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu File (.jmx)'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
