import { CheckboxField, FormField, Section, SelectField } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { boolProp, textProp } from '../editorUtils'
import { useState, useRef } from 'react'
import { FolderOpen, UploadCloud } from 'lucide-react'
import { useCsvAssetUpload } from './useCsvAssetUpload'
import { normalizeShareMode, SHARE_MODE_ALL, SHARE_MODE_GROUP, SHARE_MODE_IDENTIFIER, SHARE_MODE_THREAD } from '../../utils/ddt/csvShareMode'

export function CSVDataSetEditor({ node, updateProperties }: EditorProps) {
  const sharingMode = normalizeShareMode(textProp(node, 'sharingMode', SHARE_MODE_ALL))
  const [isCsvDragOver, setIsCsvDragOver] = useState(false)
  const { assetStatus, handleCsvFile } = useCsvAssetUpload(node, updateProperties)
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <Section title="CSV Data Set Configuration">
      {/* File input & Drag drop zone */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.dat,text/csv,text/plain"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) handleCsvFile(file)
        }}
      />

      <div
        className={`csv-drop-zone ${isCsvDragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsCsvDragOver(true)
        }}
        onDragLeave={(e) => {
          // SAFETY: DOM event targets are Nodes (or null, which contains() treats as false)
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsCsvDragOver(false)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          setIsCsvDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleCsvFile(file)
        }}
      >
        <div className="csv-drop-content">
          <UploadCloud size={20} className="csv-drop-icon" />
          <span>Drag & Drop CSV data file here, or</span>
          <button
            type="button"
            className="csv-browse-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen size={13} />
            <span>Browse CSV...</span>
          </button>
        </div>
      </div>
      {assetStatus ? <div className="asset-upload-status">{assetStatus}</div> : null}

      <div className="form-grid two-columns" style={{ marginTop: '12px' }}>
        <FormField label="Filename" value={textProp(node, 'filename')} placeholder="users.csv or data/users.csv" onChange={(filename) => updateProperties({ filename })} />
        <FormField label="File Encoding" value={textProp(node, 'encoding', 'UTF-8')} onChange={(encoding) => updateProperties({ encoding })} />
        <FormField label="Variable Names (comma-delimited)" value={textProp(node, 'variableNames')} placeholder="username,password" onChange={(variableNames) => updateProperties({ variableNames })} />
        <FormField label="Delimiter" value={textProp(node, 'delimiter', ',')} onChange={(delimiter) => updateProperties({ delimiter })} />
        <SelectField
          label="Sharing mode"
          value={sharingMode}
          options={[
            { value: SHARE_MODE_ALL, label: 'All threads' },
            { value: SHARE_MODE_GROUP, label: 'Current thread group' },
            { value: SHARE_MODE_THREAD, label: 'Current thread' },
            { value: SHARE_MODE_IDENTIFIER, label: 'Identifier' },
          ]}
          onChange={(value) => updateProperties({ sharingMode: value })}
        />
        {sharingMode === SHARE_MODE_IDENTIFIER ? <FormField label="Identifier" value={textProp(node, 'identifier')} onChange={(identifier) => updateProperties({ identifier })} /> : <div />}
      </div>
      <div className="checkbox-stack inline-checks">
        <CheckboxField label="Ignore first line" checked={boolProp(node, 'ignoreFirstLine')} onChange={(ignoreFirstLine) => updateProperties({ ignoreFirstLine })} />
        <CheckboxField label="Allow quoted data" checked={boolProp(node, 'quotedData')} onChange={(quotedData) => updateProperties({ quotedData })} />
        <CheckboxField label="Recycle on EOF" checked={boolProp(node, 'recycle', true)} onChange={(recycle) => updateProperties({ recycle })} />
        <CheckboxField label="Stop thread on EOF" checked={boolProp(node, 'stopThread')} onChange={(stopThread) => updateProperties({ stopThread })} />
      </div>
    </Section>
  )
}
