import { useEffect, useMemo, type MouseEvent } from 'react'
import { X } from 'lucide-react'
import type { JMeterComponentType, TestPlanNode } from '../../models/jmeter'
import { componentGroups } from '../../rules/componentRules'
import { useWorkspaceTabsStore } from '../../store/workspaceTabsStore'
import { collectNodeIds, findNode } from '../../utils/treeUtils'
import { componentMeta } from '../componentMeta'
import './workspaceTabs.css'

const samplerTypes = new Set<JMeterComponentType>(componentGroups.Sampler)

interface WorkspaceTabsProps {
  root: TestPlanNode
  selectedId: string
  onSelect: (id: string) => void
}

/** Tab strip of recently opened samplers; switching tabs selects the node (form data lives in the store). */
export function WorkspaceTabs({ root, selectedId, onSelect }: WorkspaceTabsProps) {
  const { openIds, open, close, closeOthers, prune } = useWorkspaceTabsStore()
  const selected = useMemo(() => findNode(root, selectedId), [root, selectedId])

  useEffect(() => {
    if (selected && samplerTypes.has(selected.type)) open(selected.id)
  }, [selected, open])

  useEffect(() => {
    prune(new Set(collectNodeIds(root)))
  }, [root, prune])

  const tabs = openIds.map((id) => findNode(root, id)).filter((n): n is TestPlanNode => n !== null)
  if (tabs.length < 2) return null

  const closeTab = (event: MouseEvent, id: string) => {
    event.stopPropagation()
    const index = openIds.indexOf(id)
    close(id)
    if (id === selectedId) {
      const neighbour = openIds[index + 1] ?? openIds[index - 1]
      if (neighbour) onSelect(neighbour)
    }
  }

  return (
    <div className="workspace-tabs" role="tablist" aria-label="Open samplers">
      {tabs.map((node) => {
        const Icon = componentMeta[node.type].icon
        const method = node.type === 'HTTPRequest' ? String(node.properties.method || 'GET').toUpperCase() : null
        const active = node.id === selectedId
        return (
          <div
            key={node.id}
            role="tab"
            tabIndex={active ? 0 : -1}
            aria-selected={active}
            className={`workspace-tab ${active ? 'active' : ''} ${node.enabled === false ? 'disabled-node' : ''}`}
            title={node.name}
            onClick={() => onSelect(node.id)}
            onAuxClick={(e) => e.button === 1 && closeTab(e, node.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(node.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              if (window.confirm(`Close all tabs except "${node.name}"?`)) closeOthers(node.id)
            }}
          >
            {method ? <span className="workspace-tab-method">{method}</span> : <Icon size={13} />}
            <span className="workspace-tab-name">{node.name}</span>
            <button type="button" className="workspace-tab-close" aria-label={`Close ${node.name}`} onClick={(e) => closeTab(e, node.id)}>
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
