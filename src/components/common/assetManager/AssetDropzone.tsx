import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

interface AssetDropzoneProps {
  activeDir: string
  onUpload: (files: FileList | null) => void
}

/** Hidden file input + drag-and-drop upload zone. */
export function AssetDropzone({ activeDir, onUpload }: AssetDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        onChange={(event) => {
          onUpload(event.target.files)
          event.target.value = ''
        }}
      />

      <div
        className={`asset-manager-dropzone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={(event) => {
          // SAFETY: DOM event targets are Nodes (or null, which contains() treats as false)
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragOver(false)
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragOver(false)
          onUpload(event.dataTransfer.files)
        }}
      >
        <UploadCloud size={21} />
        <span>Drop files into {activeDir}/ or choose from your computer.</span>
        <button type="button" className="text-button" onClick={() => fileInputRef.current?.click()}>
          <UploadCloud size={14} />
          Upload
        </button>
      </div>
    </>
  )
}
