import { HardDrive } from 'lucide-react'
import { formatBytes, type SelectedPlugin } from './constants'

interface PluginPackageDetailsProps {
  selectedPlugin: SelectedPlugin
}

export function PluginPackageDetails({ selectedPlugin }: PluginPackageDetailsProps) {
  return (
    <div style={{ background: '#ffffff', padding: '14px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
        Package Details
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '4px', color: '#64748b' }}>
        <span>Target Directory:</span>
        <span style={{ color: '#0f172a', fontWeight: 500 }}>
          {selectedPlugin.targetDir || 'lib/ext'} (JMeter Extension)
        </span>

        <span>Version:</span>
        <span style={{ color: '#0f172a', fontWeight: 500 }}>
          {selectedPlugin.installedVersion ? `v${selectedPlugin.installedVersion}` : `v${selectedPlugin.version}`}
        </span>

        {selectedPlugin.jarSize ? (
          <>
            <span>File Size:</span>
            <span style={{ color: '#0f172a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HardDrive size={12} />
              {formatBytes(selectedPlugin.jarSize)}
            </span>
          </>
        ) : null}

        {selectedPlugin.jarPath ? (
          <>
            <span>File Location:</span>
            <span style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
              {selectedPlugin.jarPath}
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}
