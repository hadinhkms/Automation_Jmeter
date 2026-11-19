import { useState } from 'react'
import type { TestPlanNode } from '../../models/jmeter'
import { projectAssetService } from '../../services/projectAssetService'
import { findConflictingAsset, overwritePrompt } from '../../utils/ddt/csvAssetConflict'
import { textProp } from '../editorUtils'

/** CSV Data Set editor: upload a CSV into data/ (confirming before overwriting) and prefill variable names. */
export function useCsvAssetUpload(node: TestPlanNode, updateProperties: (updates: Record<string, unknown>) => void) {
  const [assetStatus, setAssetStatus] = useState('')

  const handleCsvFile = async (file: File) => {
    try {
      const existing = findConflictingAsset(await projectAssetService.listAssets().catch(() => []), file.name)
      if (existing && !window.confirm(overwritePrompt(existing))) {
        setAssetStatus('Upload cancelled.')
        return
      }
      setAssetStatus('Uploading CSV asset...')
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

  return { assetStatus, handleCsvFile }
}
