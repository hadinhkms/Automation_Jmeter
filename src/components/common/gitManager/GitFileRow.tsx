import { FileCode2, FileSpreadsheet, FileText } from 'lucide-react'
import type { GitStatusResult } from '../../../services/gitService'

interface GitFileRowProps {
  file: GitStatusResult['files'][number]
  isSelected: boolean
  onSelect: (path: string) => void
}

export function GitFileRow({ file, isSelected, onSelect }: GitFileRowProps) {
  const isJmx = file.path.endsWith('.jmx')
  const isCsv = file.path.endsWith('.csv')
  return (
    <div
      onClick={() => onSelect(file.path)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 10px',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12.5,
        background: isSelected ? '#dbeafe' : 'transparent',
        color: isSelected ? '#1d4ed8' : '#1e293b',
        fontWeight: isSelected ? 600 : 400,
        marginBottom: 3,
        transition: 'background 0.1s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {isJmx ? (
          <FileCode2 size={15} color="#d97706" />
        ) : isCsv ? (
          <FileSpreadsheet size={15} color="#059669" />
        ) : (
          <FileText size={15} color="#64748b" />
        )}
        <span title={file.path}>{file.path}</span>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
          textTransform: 'uppercase',
          flexShrink: 0,
          background:
            file.status === 'modified'
              ? '#fef3c7'
              : file.status === 'added' || file.status === 'untracked'
                ? '#d1fae5'
                : '#fee2e2',
          color:
            file.status === 'modified'
              ? '#b45309'
              : file.status === 'added' || file.status === 'untracked'
                ? '#047857'
                : '#b91c1c',
        }}
      >
        {file.status === 'untracked' ? 'NEW' : file.status.slice(0, 3)}
      </span>
    </div>
  )
}
