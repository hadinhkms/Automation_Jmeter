import { Save, X, FileCode, AlertCircle } from 'lucide-react'
import { useSaveTestPlan } from './saveTestPlan/useSaveTestPlan'
import { SaveFilePreviewCard } from './saveTestPlan/SaveFilePreviewCard'
import { SaveTestPlanFooter } from './saveTestPlan/SaveTestPlanFooter'

export interface SaveTestPlanModalProps {
  isOpen: boolean
  isPromptBeforeRun?: boolean
  onClose: () => void
  onSavedAndRun?: () => void
  onRunWithoutSaving?: () => void
}

export function SaveTestPlanModal({
  isOpen,
  isPromptBeforeRun = false,
  onClose,
  onSavedAndRun,
  onRunWithoutSaving,
}: SaveTestPlanModalProps) {
  const { store, fileNameInput, setFileNameInput, errorMsg, setErrorMsg, isSaving, handleSave } = useSaveTestPlan(
    isOpen,
    onClose,
    onSavedAndRun,
  )

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content save-plan-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <Save size={18} className="text-primary" />
            <span>{isPromptBeforeRun ? 'Lưu Kịch Bản Trước Khi Chạy' : 'Lưu Kịch Bản Test Plan (.jmx)'}</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Đóng">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isPromptBeforeRun ? (
            <div className="save-modal-alert">
              <AlertCircle size={18} className="alert-icon" />
              <div>
                <strong>Kịch bản chưa được lưu thành tệp!</strong>
                <p>Bạn nên lưu file <code>.jmx</code> để dễ dàng mở lại, quản lý và kiểm tra sau khi chạy.</p>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Nhập tên tệp kịch bản JMeter (<code>.jmx</code>) để lưu về máy và ghim vào kịch bản hiện tại.
            </p>
          )}

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Tên tệp kịch bản (File name):
            </label>
            <div className="save-input-wrap">
              <FileCode size={16} className="input-icon" />
              <input
                type="text"
                className="save-filename-input"
                value={fileNameInput}
                onChange={(e) => {
                  setFileNameInput(e.target.value)
                  setErrorMsg('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave(isPromptBeforeRun)
                  if (e.key === 'Escape') onClose()
                }}
                placeholder="VD: API_Load_Test.jmx"
                autoFocus
              />
            </div>
            {errorMsg ? <div className="save-error-msg">{errorMsg}</div> : null}
          </div>

          <SaveFilePreviewCard planName={store.testPlan.name} dirty={store.dirty} />
        </div>

        <SaveTestPlanFooter
          isPromptBeforeRun={isPromptBeforeRun}
          isSaving={isSaving}
          onClose={onClose}
          onRunWithoutSaving={onRunWithoutSaving}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}
