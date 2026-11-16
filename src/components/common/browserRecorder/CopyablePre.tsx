import type { ReactNode } from 'react'
import { Copy, Check } from 'lucide-react'
import * as P from '../../../features/browserRecorder/panelStyles'

interface CopyablePreProps {
  copyKey: string
  copyText: string
  copiedKey: string | null
  onCopy: (text: string, key: string) => void
  fontSize: string
  maxHeight: string
  children: ReactNode
}

/** Monospace code block with a floating Copy button. */
export function CopyablePre({ copyKey, copyText, copiedKey, onCopy, fontSize, maxHeight, children }: CopyablePreProps) {
  const copied = copiedKey === copyKey
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => onCopy(copyText, copyKey)} style={P.copyBtn}>
        {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre style={P.codePre(fontSize, maxHeight)}>{children}</pre>
    </div>
  )
}
