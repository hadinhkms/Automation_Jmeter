import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { useEnvironmentStore } from '../../store/environmentStore'
import { useEnvironmentSync } from './useEnvironmentSync'
import { EnvironmentDropdownMenu } from './EnvironmentDropdownMenu'

export function EnvironmentSwitcher() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { environments, activeEnvId, setActiveEnvironment, getActiveEnvironment } = useEnvironmentStore()
  const { feedback, fileInputRef, handleSyncToUDV, handleFileChange } = useEnvironmentSync()
  const activeEnv = getActiveEnvironment()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="env-switcher-wrap" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="tool-button"
        onClick={() => setOpen(!open)}
        title="Active Environment. Click to switch or import environment."
        style={{
          height: 26,
          padding: '0 8px',
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 4,
          color: '#3b82f6',
          fontSize: 12,
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <Globe size={13} />
        <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeEnv?.name || 'No Environment'}
        </span>
        <ChevronDown size={12} />
      </button>

      {open ? (
        <EnvironmentDropdownMenu
          environments={environments}
          activeEnvId={activeEnvId}
          feedback={feedback}
          onSelect={(id) => {
            setActiveEnvironment(id)
            setOpen(false)
          }}
          onSync={handleSyncToUDV}
          onUploadClick={() => fileInputRef.current?.click()}
        />
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
