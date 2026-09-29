import { useRef, useState } from 'react'
import { CheckCircle2, FileJson, UploadCloud } from 'lucide-react'

interface PostmanFileUploaderProps {
  onFileLoaded: (content: string, fileName: string) => void
  detectedInfo?: { name: string; version: string; count: number } | null
}

export function PostmanFileUploader({ onFileLoaded, detectedInfo }: PostmanFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      alert('Please upload a valid .json file.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === 'string') {
        onFileLoaded(text, file.name)
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#3b82f6' : 'var(--border-color, #475569)'}`,
          background: isDragging ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0, 0, 0, 0.15)',
          borderRadius: 8,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) handleFile(e.target.files[0])
          }}
        />
        <UploadCloud size={32} color="#60a5fa" style={{ margin: '0 auto 8px' }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-color, #e2e8f0)' }}>
          Drop Postman Collection JSON here, or <span style={{ color: '#60a5fa' }}>browse</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
          Supports Postman Collection format v2.0 and v2.1
        </div>
      </div>

      {detectedInfo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid #22c55e',
            borderRadius: 6,
            fontSize: 12,
            color: '#4ade80',
          }}
        >
          <CheckCircle2 size={16} />
          <FileJson size={15} />
          <span>
            <strong>{detectedInfo.name}</strong> ({detectedInfo.version}) – {detectedInfo.count} items detected
          </span>
        </div>
      )}
    </div>
  )
}
