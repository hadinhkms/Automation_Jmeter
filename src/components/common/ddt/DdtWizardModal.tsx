import { useRef, useState } from 'react'
import { AlertCircle, FileSpreadsheet, Loader2, UploadCloud, X } from 'lucide-react'
import type { TestPlanNode } from '../../../models/jmeter'
import { DdtPreviewTable } from './DdtPreviewTable'
import { DdtRunOptionsFields } from './DdtRunOptionsFields'
import { useDdtWizard } from './useDdtWizard'
import './ddtWizard.css'

interface DdtWizardModalProps {
  isOpen: boolean
  /** Name of the node the CSV Data Set will be added under (or next to). */
  targetName: string
  onClose: () => void
  onInsert: (node: TestPlanNode) => void
}

/** FEAT-P6: upload a CSV, preview 5 rows, map columns to ${var} and add a CSV Data Set Config. */
export function DdtWizardModal({ isOpen, targetName, onClose, onInsert }: DdtWizardModalProps) {
  const wizard = useDdtWizard()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  if (!isOpen) return null

  const close = () => {
    wizard.reset()
    onClose()
  }

  const handleCreate = async () => {
    const node = await wizard.create()
    if (!node) return
    onInsert(node)
    close()
  }

  const pick = (file: File | undefined) => {
    if (file) void wizard.loadFile(file)
  }

  return (
    <div className="modal-overlay" onClick={wizard.busy ? undefined : close}>
      <div className="modal-container ddt-modal" role="dialog" aria-modal="true" aria-labelledby="ddt-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <FileSpreadsheet size={18} style={{ color: 'var(--accent)' }} />
            <h3 id="ddt-modal-title">Data-Driven Test – Import CSV</h3>
          </div>
          <button type="button" className="modal-close-button" aria-label="Close CSV wizard" disabled={wizard.busy} onClick={close}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body ddt-modal-body">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt,.dat,text/csv,text/plain"
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className={`ddt-drop-zone ${dragOver ? 'drag-over' : ''}`}
            disabled={wizard.busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              pick(e.dataTransfer.files?.[0])
            }}
          >
            <UploadCloud size={20} />
            <span>{wizard.file ? wizard.file.name : 'Drop a CSV file here or click to choose'}</span>
            <small>First row must be column names · comma, semicolon or tab · max 20 MB</small>
          </button>

          {wizard.error ? <div className="ddt-error" role="alert"><AlertCircle size={14} /> {wizard.error}</div> : null}

          {wizard.preview ? (
            <>
              <DdtPreviewTable
                preview={wizard.preview}
                varNames={wizard.varNames}
                varErrors={wizard.varErrors}
                disabled={wizard.busy}
                onRename={wizard.renameVar}
              />
              <DdtRunOptionsFields options={wizard.options} disabled={wizard.busy} onChange={wizard.setOptions} />
            </>
          ) : null}
        </div>

        <div className="modal-footer">
          <span className="ddt-target">Adds to: <strong>{targetName}</strong></span>
          <button type="button" className="btn btn-secondary" disabled={wizard.busy} onClick={close}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!wizard.canCreate} onClick={() => void handleCreate()}>
            {wizard.busy ? <Loader2 size={14} className="spin-icon" /> : null}
            {wizard.busy ? 'Uploading…' : 'Create CSV Data Set Config'}
          </button>
        </div>
      </div>
    </div>
  )
}
