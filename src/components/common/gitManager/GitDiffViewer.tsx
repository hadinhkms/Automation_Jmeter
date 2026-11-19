import { FileDiff } from 'lucide-react'

interface GitDiffViewerProps {
  selectedFile: string | null
  diffText: string
  diffLoading: boolean
}

export function GitDiffViewer({ selectedFile, diffText, diffLoading }: GitDiffViewerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13.5,
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          <FileDiff size={17} color="#2563eb" />
          <span>Visual Diff: {selectedFile || 'Select a file on the left to inspect'}</span>
        </div>
        {selectedFile && (
          <span
            style={{
              fontSize: 11,
              color: '#1d4ed8',
              background: '#dbeafe',
              padding: '3px 9px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            {selectedFile.endsWith('.jmx') ? 'JMX Tree Diff' : selectedFile.split('.').pop()?.toUpperCase()}
          </span>
        )}
      </div>

      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          background: '#0d1117',
          color: '#c9d1d9',
          fontFamily: 'monospace',
          fontSize: 12.5,
          overflowY: 'auto',
          padding: 16,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.55,
        }}
      >
        {diffLoading ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#888' }}>Loading diff...</div>
        ) : diffText ? (
          diffText.split('\n').map((line, i) => {
            let color = '#c9d1d9'
            let bg = 'transparent'
            if (line.startsWith('+') && !line.startsWith('+++')) {
              color = '#3fb950'
              bg = 'rgba(46, 160, 67, 0.15)'
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              color = '#f85149'
              bg = 'rgba(248, 81, 73, 0.15)'
            } else if (line.startsWith('@@')) {
              color = '#58a6ff'
              bg = 'rgba(56, 139, 253, 0.1)'
            }
            return (
              <div key={i} style={{ color, background: bg, padding: '1px 6px', borderRadius: 2 }}>
                {line}
              </div>
            )
          })
        ) : (
          <div style={{ padding: 30, textAlign: 'center', color: '#888' }}>
            {selectedFile ? 'No changes detected for this file against HEAD.' : 'Select a file on the left to inspect changes.'}
          </div>
        )}
      </div>
    </div>
  )
}
