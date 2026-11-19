interface SaveFilePreviewCardProps {
  planName: string
  dirty: boolean
}

export function SaveFilePreviewCard({ planName, dirty }: SaveFilePreviewCardProps) {
  return (
    <div className="save-file-preview-card">
      <div className="preview-row">
        <span className="preview-label">Định dạng tệp:</span>
        <span className="preview-val">Apache JMeter Test Plan XML (5.0 / 5.6.3)</span>
      </div>
      <div className="preview-row">
        <span className="preview-label">Node gốc:</span>
        <span className="preview-val"><strong>{planName}</strong></span>
      </div>
      <div className="preview-row">
        <span className="preview-label">Trạng thái lưu:</span>
        <span className="preview-val" style={{ color: dirty ? '#ef4444' : '#10b981' }}>
          {dirty ? '● Có thay đổi chưa lưu' : '✓ Đã đồng bộ'}
        </span>
      </div>
    </div>
  )
}
