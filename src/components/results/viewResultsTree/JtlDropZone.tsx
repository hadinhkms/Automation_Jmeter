import { useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { UploadCloud } from 'lucide-react'

interface JtlDropZoneProps {
  fileInputRef: RefObject<HTMLInputElement>
  onImportFile: (file: File) => void
  children: ReactNode
}

/** Root of the View Results Tree: accepts dropped / browsed JTL or CSV files. */
export function JtlDropZone({ fileInputRef, onImportFile, children }: JtlDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  return (
    <div
      className={`jmeter-results-tree-root ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={(e) => {
        // SAFETY: DOM event targets are Nodes (or null, which contains() treats as false)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) {
          onImportFile(file)
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".jtl,.csv,.xml,text/csv,application/xml"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) {
            onImportFile(file)
          }
        }}
      />

      {/* Floating Drag Overlay */}
      {isDragOver ? (
        <div className="vrt-drag-drop-overlay">
          <UploadCloud size={42} className="drag-icon" />
          <h3>Drop JTL / CSV Results File Here</h3>
          <p>Instantly load and parse test results into View Results Tree</p>
        </div>
      ) : null}

      {children}
    </div>
  )
}
