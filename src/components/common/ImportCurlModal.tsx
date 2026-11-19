import { PlusCircle } from 'lucide-react'
import type { TestPlanNode } from '../../models/jmeter'
import { useImportCurl } from './importCurl/useImportCurl'
import { ImportCurlHeader } from './importCurl/ImportCurlHeader'
import { CurlInputSection } from './importCurl/CurlInputSection'
import { CurlPreviewCard } from './importCurl/CurlPreviewCard'
import { ImportCurlOptions } from './importCurl/ImportCurlOptions'

interface ImportCurlModalProps {
  isOpen: boolean
  targetNode: TestPlanNode
  onClose: () => void
  onImport: (samplerNode: TestPlanNode, targetParentId?: string) => void
}

export function ImportCurlModal({
  isOpen,
  targetNode,
  onClose,
  onImport,
}: ImportCurlModalProps) {
  const {
    curlInput,
    setCurlInput,
    samplerName,
    setSamplerName,
    createHeaderManager,
    setCreateHeaderManager,
    createCookieManager,
    setCreateCookieManager,
    errorMsg,
    parsed,
    handleImport,
    handlePasteSample,
  } = useImportCurl(isOpen, targetNode, onClose, onImport)

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container import-curl-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '92%' }}
      >
        <ImportCurlHeader onClose={onClose} />

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px' }}>
          <CurlInputSection
            curlInput={curlInput}
            errorMsg={errorMsg}
            onChange={setCurlInput}
            onPasteSample={handlePasteSample}
          />

          {/* Live Parsing Preview Card */}
          {parsed && parsed.url ? (
            <CurlPreviewCard parsed={parsed} />
          ) : null}

          {/* Import Configuration Fields */}
          <ImportCurlOptions
            parsed={parsed}
            targetNode={targetNode}
            samplerName={samplerName}
            createHeaderManager={createHeaderManager}
            createCookieManager={createCookieManager}
            onSamplerNameChange={setSamplerName}
            onCreateHeaderManagerChange={setCreateHeaderManager}
            onCreateCookieManagerChange={setCreateCookieManager}
          />
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '12px 20px', borderTop: '1px solid var(--border-color, #334155)' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleImport}
            disabled={!parsed || !parsed.url}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusCircle size={15} />
            Import into Test Plan
          </button>
        </div>
      </div>
    </div>
  )
}
