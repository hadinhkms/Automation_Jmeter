import { UploadCloud } from 'lucide-react'

/** Global Drag & Drop Overlay */
export function GlobalDropOverlay({ dragFileType }: { dragFileType: 'jmx' | 'jtl' | 'other' }) {
  return (
    <div className="global-dropzone-modal">
      <div className="global-dropzone-box">
        <UploadCloud size={56} className="global-drop-icon" />
        <h2>Drop file to import into JMeter Web UI</h2>
        <p>
          {dragFileType === 'jtl'
            ? 'Drop .jtl / .csv to load and view test results in View Results Tree'
            : 'Drop .jmx file to load and edit Test Plan, or .jtl / .csv to view results'}
        </p>
        <div className="dropzone-supported-tags">
          <span className="drop-tag">.JMX Test Plan</span>
          <span className="drop-tag">.JTL Results</span>
          <span className="drop-tag">.CSV Data / Results</span>
          <span className="drop-tag">.XML</span>
        </div>
      </div>
    </div>
  )
}
