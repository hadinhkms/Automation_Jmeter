import { useRef, useState } from 'react'
import type { TestPlanNode } from '../../models/jmeter'
import type { DropPosition, TreeDragState, TreeProps } from './treeTypes'

/** Drag-and-drop state and handlers for a single tree row. */
export function useTreeRowDrag(node: TestPlanNode, props: TreeProps, drag: TreeDragState) {
  const { draggedNodeId, setDraggedNodeId } = drag
  const [dropPosition, setDropPosition] = useState<DropPosition>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const isRoot = node.id === props.root.id

  const handleDragStart = (event: React.DragEvent) => {
    if (isRoot) {
      event.preventDefault()
      return
    }
    event.stopPropagation()
    setDraggedNodeId(node.id)
    event.dataTransfer.setData('text/plain', node.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!draggedNodeId || draggedNodeId === node.id) return

    if (!rowRef.current) return
    const rect = rowRef.current.getBoundingClientRect()
    const relativeY = event.clientY - rect.top
    const height = rect.height

    const isContainer =
      node.id === props.root.id ||
      node.type === 'ThreadGroup' ||
      node.type === 'SimpleController' ||
      node.type === 'TransactionController' ||
      node.type === 'IfController' ||
      node.type === 'LoopController' ||
      node.type === 'WhileController'

    let pos: DropPosition = 'after'
    if (relativeY < height * 0.3) {
      pos = isRoot ? 'inside' : 'before'
    } else if (relativeY > height * 0.7) {
      pos = 'after'
    } else if (isContainer) {
      pos = 'inside'
    } else {
      pos = relativeY < height * 0.5 ? 'before' : 'after'
    }

    setDropPosition(pos)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    if (!rowRef.current?.contains(event.relatedTarget as Node)) {
      setDropPosition(null)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const sourceId = event.dataTransfer.getData('text/plain') || draggedNodeId
    const targetPos = dropPosition
    setDropPosition(null)
    setDraggedNodeId(null)

    if (sourceId && sourceId !== node.id && targetPos && props.onMoveNode) {
      props.onMoveNode(sourceId, node.id, targetPos)
    }
  }

  return { rowRef, dropPosition, isRoot, handleDragStart, handleDragOver, handleDragLeave, handleDrop }
}
