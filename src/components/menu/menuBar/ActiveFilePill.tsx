import { FileCode } from 'lucide-react'

export function ActiveFilePill({
  fileName,
  dirty,
  onClick,
}: {
  fileName?: string | null
  dirty?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`app-active-file-pill ${dirty ? 'is-dirty' : ''}`}
      onClick={onClick}
      title="Click to Rename / Save Test Plan As..."
    >
      <FileCode size={13} />
      <span>{fileName || 'Untitled Test Plan'}</span>
      {dirty ? (
        <span className="file-dirty-dot" title="Unsaved changes">●</span>
      ) : (
        <span className="file-saved-check" title="Saved">✓</span>
      )}
    </button>
  )
}
