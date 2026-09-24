// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { EditableTable } from '../components/common/EditableTable'
import {
  CheckboxField,
  FormField,
  Section,
  SelectField,
} from '../components/common/FormControls'
import type { EditorProps } from './editorUtils'
import { boolProp, rowsProp, textProp } from './editorUtils'

export function HTTPHeaderManagerEditor({ node, updateProperties }: EditorProps) {
  return (
    <Section title="HTTP Headers">
      <EditableTable
        columns={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }]}
        rows={rowsProp(node, 'headers')}
        newRow={{ name: '', value: '' }}
        onChange={(headers) => updateProperties({ headers })}
      />
    </Section>
  )
}

export function HTTPCookieManagerEditor({ node, updateProperties }: EditorProps) {
  return (
    <>
      <Section title="Cookie Policy">
        <div className="checkbox-stack inline-checks">
          <CheckboxField label="Clear cookies each iteration" checked={boolProp(node, 'clearEachIteration')} onChange={(clearEachIteration) => updateProperties({ clearEachIteration })} />
          <CheckboxField label="Controlled by Thread Group" checked={boolProp(node, 'controlledByThreadGroup')} onChange={(controlledByThreadGroup) => updateProperties({ controlledByThreadGroup })} />
        </div>
      </Section>
      <Section title="Stored Cookies">
        <EditableTable
          columns={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }, { key: 'domain', label: 'Domain' }, { key: 'path', label: 'Path' }, { key: 'secure', label: 'Secure', type: 'checkbox' }, { key: 'expires', label: 'Expires' }]}
          rows={rowsProp(node, 'cookies')}
          newRow={{ name: '', value: '', domain: '', path: '/', secure: false, expires: '' }}
          onChange={(cookies) => updateProperties({ cookies })}
        />
      </Section>
    </>
  )
}

import { useState, useRef } from 'react'
import { FolderOpen, UploadCloud } from 'lucide-react'
import { projectAssetService } from '../services/projectAssetService'

export function CSVDataSetEditor({ node, updateProperties }: EditorProps) {
  const sharingMode = textProp(node, 'sharingMode', 'all')
  const [isCsvDragOver, setIsCsvDragOver] = useState(false)
  const [assetStatus, setAssetStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCsvFile = async (file: File) => {
    setAssetStatus('Uploading CSV asset...')
    try {
      const uploaded = await projectAssetService.uploadAsset(file, 'data')
      updateProperties({ filename: uploaded.relativePath })
      setAssetStatus(`Uploaded ${uploaded.relativePath}`)
    } catch (error) {
      updateProperties({ filename: file.name })
      setAssetStatus(error instanceof Error ? `Upload failed: ${error.message}` : 'Upload failed')
    }

    try {
      const text = await file.text()
      const firstLine = text.split(/\r?\n/)[0]
      if (firstLine && firstLine.includes(',')) {
        const headers = firstLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
        if (headers.length > 0 && !textProp(node, 'variableNames')) {
          updateProperties({ variableNames: headers.join(',') })
        }
      }
    } catch {
      // ignore
    }
  }

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
            { value: 'all', label: 'All threads' },
            { value: 'group', label: 'Current thread group' },
            { value: 'thread', label: 'Current thread' },
            { value: 'identifier', label: 'Identifier' },
          ]}
          onChange={(value) => updateProperties({ sharingMode: value })}
        />
        {sharingMode === 'identifier' ? <FormField label="Identifier" value={textProp(node, 'identifier')} onChange={(identifier) => updateProperties({ identifier })} /> : <div />}
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
