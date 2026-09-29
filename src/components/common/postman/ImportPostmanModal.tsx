import { useMemo, useState } from 'react'
import { FileCode, X } from 'lucide-react'
import type { TestPlanNode } from '../../../models/jmeter'
import type { FlatPostmanItem, PostmanCollection } from '../../../utils/postman/postmanTypes'
import { convertCollectionToNodes, extractFlatItems, parsePostmanCollection } from '../../../utils/postman/postmanParser'
import { PostmanFileUploader } from './PostmanFileUploader'
import { PostmanItemTreePreview } from './PostmanItemTreePreview'
import { PostmanImportOptions } from './PostmanImportOptions'

interface ImportPostmanModalProps {
  isOpen: boolean
  testPlan: TestPlanNode
  onClose: () => void
  onImport: (nodes: TestPlanNode[], targetParentId: string) => void
}

function findThreadGroups(node: TestPlanNode): Array<{ id: string; name: string }> {
  const result: Array<{ id: string; name: string }> = []
  if (['ThreadGroup', 'ConcurrencyThreadGroup', 'SteppingThreadGroup', 'UltimateThreadGroup'].includes(node.type)) {
    result.push({ id: node.id, name: node.name })
  }
  for (const child of node.children) {
    result.push(...findThreadGroups(child))
  }
  return result
}

export function ImportPostmanModal({
  isOpen,
  testPlan,
  onClose,
  onImport,
}: ImportPostmanModalProps) {
  const [collection, setCollection] = useState<PostmanCollection | null>(null)
  const [version, setVersion] = useState<string>('')
  const [flatItems, setFlatItems] = useState<FlatPostmanItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [autoConvertVars, setAutoConvertVars] = useState(true)
  const [generateHeaderManager, setGenerateHeaderManager] = useState(true)
  const [targetGroupId, setTargetGroupId] = useState('')

  const threadGroups = useMemo(() => findThreadGroups(testPlan), [testPlan])

  if (!isOpen) return null

  const handleFileLoaded = (jsonText: string) => {
    const res = parsePostmanCollection(jsonText)
    if (res.error || !res.collection) {
      alert(res.error || 'Failed to parse Postman collection.')
      return
    }
    setCollection(res.collection)
    setVersion(res.version || 'v2.x')
    const extracted = extractFlatItems(res.collection.item)
    setFlatItems(extracted)
    setSelectedIds(new Set(extracted.filter((it) => !it.isFolder).map((it) => it.id)))
    if (!targetGroupId && threadGroups.length > 0) {
      setTargetGroupId(threadGroups[0].id)
    }
  }

  const handleImport = () => {
    if (!collection) return
    const newNodes = convertCollectionToNodes(collection.item, selectedIds, {
      autoConvertVars,
      generateHeaderManager,
    })

    if (newNodes.length === 0) {
      alert('No requests selected for import.')
      return
    }

    const targetId = targetGroupId || testPlan.id
    onImport(newNodes, targetId)
    onClose()
  }

  const selectedCount = flatItems.filter((it) => !it.isFolder && selectedIds.has(it.id)).length

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCode size={18} color="#60a5fa" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Import Postman Collection</h3>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <PostmanFileUploader
            onFileLoaded={handleFileLoaded}
            detectedInfo={collection ? { name: collection.info.name, version, count: flatItems.filter((i) => !i.isFolder).length } : null}
          />

          {flatItems.length > 0 && (
            <>
              <PostmanItemTreePreview
                items={flatItems}
                selectedIds={selectedIds}
                onToggleItem={(id) => {
                  const next = new Set(selectedIds)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  setSelectedIds(next)
                }}
                onSelectAll={() => setSelectedIds(new Set(flatItems.filter((i) => !i.isFolder).map((i) => i.id)))}
                onDeselectAll={() => setSelectedIds(new Set())}
              />

              <PostmanImportOptions
                threadGroups={threadGroups}
                targetGroupId={targetGroupId}
                onSelectTargetGroup={setTargetGroupId}
                autoConvertVars={autoConvertVars}
                onToggleAutoConvertVars={setAutoConvertVars}
                generateHeaderManager={generateHeaderManager}
                onToggleGenerateHeaderManager={setGenerateHeaderManager}
              />
            </>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!collection || selectedCount === 0}
          >
            Import Selected ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  )
}
