import { Radio, UploadCloud } from 'lucide-react'
import type { RecorderTab } from '../../../features/browserRecorder/recorderTypes'
import * as P from '../../../features/browserRecorder/panelStyles'

interface EmptyRequestsProps {
  activeTab: RecorderTab
  isRecording: boolean
}

export function EmptyRequests({ activeTab, isRecording }: EmptyRequestsProps) {
  return (
    <div style={P.emptyState}>
      {activeTab === 'live' ? (
        <>
          <Radio size={40} style={P.emptyIcon} />
          <h4 style={P.emptyTitle}>
            {isRecording ? 'Waiting for browser network requests...' : 'Ready to record'}
          </h4>
          <p style={P.emptyText}>
            {isRecording
              ? 'Interact with the opened browser window. All API and page requests will appear here in real time.'
              : 'Enter your website URL above and click "Start Recording" to launch an automated Chrome/Edge session.'}
          </p>
        </>
      ) : (
        <>
          <UploadCloud size={40} style={P.emptyIcon} />
          <h4 style={P.emptyTitle}>No HAR file loaded</h4>
          <p style={P.emptyText}>
            Click "Choose .HAR File..." above or drag-and-drop a .har export from your browser developer tools.
          </p>
        </>
      )}
    </div>
  )
}
