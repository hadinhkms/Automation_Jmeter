import { useRef, useState } from 'react'
import type { TestPlanNode } from '../../models/jmeter'
import { projectAssetService } from '../../services/projectAssetService'
import type { EditorProps } from '../editorUtils'
import { rowsProp } from '../editorUtils'

export function useHttpFileUpload(node: TestPlanNode, updateProperties: EditorProps['updateProperties']) {
  const [fileUploadStatus, setFileUploadStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadRequestFile = async (file: File) => {
    setFileUploadStatus('Uploading request file...')
    try {
      const uploaded = await projectAssetService.uploadAsset(file, 'data')
      updateProperties({
        files: [
          ...rowsProp(node, 'files'),
          {
            path: uploaded.relativePath,
            parameterName: file.name.replace(/\.[^.]+$/, ''),
            mimeType: file.type || 'application/octet-stream',
          },
        ],
        multipart: true,
      })
      setFileUploadStatus(`Uploaded ${uploaded.relativePath}`)
    } catch (error) {
      setFileUploadStatus(error instanceof Error ? `Upload failed: ${error.message}` : 'Upload failed')
    }
  }

  return { fileUploadStatus, fileInputRef, handleUploadRequestFile }
}
