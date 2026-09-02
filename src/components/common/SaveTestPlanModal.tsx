import { useState, useEffect, useMemo } from 'react'
import { Save, Play, Download, X, FileCode, AlertCircle } from 'lucide-react'
import { useJMeterStore } from '../../store/jmeterStore'
import { localProjectService } from '../../services/projectService'

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
  const store = useJMeterStore()
  const defaultName = useMemo(() => {
    if (store.fileName) return store.fileName
    const cleanRootName = store.testPlan.name
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
    return `${cleanRootName || 'Test_Plan'}.jmx`
  }, [store.fileName, store.testPlan.name])

  const [fileNameInput, setFileNameInput] = useState(defaultName)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFileNameInput(defaultName)
      setErrorMsg('')
      setIsSaving(false)
    }
  }, [isOpen, defaultName])

  if (!isOpen) return null

  const handleSave = async (andRun = false) => {
    const trimmed = fileNameInput.trim()
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập tên file (.jmx)')
      return
    }

    const finalName = trimmed.endsWith('.jmx') ? trimmed : `${trimmed}.jmx`

    try {
      setIsSaving(true)
      // Export and download JMX
      const xml = await localProjectService.exportJmx(store.testPlan)
      const blobUrl = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = finalName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)

      // Update store
      store.markSaved(finalName)
      setIsSaving(false)
      onClose()

      if (andRun && onSavedAndRun) {
        onSavedAndRun()
      }
    } catch (err) {
      setIsSaving(false)
      setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu file JMX')
    }
  }

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

          <div className="save-file-preview-card">
            <div className="preview-row">
              <span className="preview-label">Định dạng tệp:</span>
              <span className="preview-val">Apache JMeter Test Plan XML (5.0 / 5.6.3)</span>
            </div>
            <div className="preview-row">
              <span className="preview-label">Node gốc:</span>
              <span className="preview-val"><strong>{store.testPlan.name}</strong></span>
            </div>
            <div className="preview-row">
              <span className="preview-label">Trạng thái lưu:</span>
              <span className="preview-val" style={{ color: store.dirty ? '#ef4444' : '#10b981' }}>
                {store.dirty ? '● Có thay đổi chưa lưu' : '✓ Đã đồng bộ'}
              </span>
            </div>
          </div>
        </div>

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
                onClick={() => handleSave(true)}
              >
                <Play size={14} fill="currentColor" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu & Chạy Test'}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSaving}
                onClick={() => handleSave(false)}
              >
                <Download size={14} />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu File (.jmx)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
