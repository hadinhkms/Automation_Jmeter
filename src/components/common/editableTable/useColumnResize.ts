import { useEffect, useRef, useState } from 'react'
import type { ColumnDrag, ColumnWidths, TableColumn } from '../../../models/editableTable'
import { measureColumnWidths as measureTable, resizedWidths } from './columnResizeHelpers'

/** Drag/keyboard column resizing state for EditableTable. */
export function useColumnResize(columns: TableColumn[]) {
  const tableRef = useRef<HTMLTableElement>(null)
  const dragRef = useRef<ColumnDrag | null>(null)
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({})

  const measureColumnWidths = () => measureTable(tableRef.current)

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      setColumnWidths(resizedWidths(
        drag.startWidths,
        drag.leftKey,
        drag.rightKey,
        event.clientX - drag.startX,
        drag.minLeft,
        drag.minRight,
      ))
    }

    const handlePointerUp = () => {
      const drag = dragRef.current
      if (!drag) return
      document.body.style.cursor = drag.previousCursor
      document.body.style.userSelect = drag.previousUserSelect
      dragRef.current = null
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      handlePointerUp()
    }
  }, [])

  const startResize = (event: React.PointerEvent, columnIndex: number) => {
    const column = columns[columnIndex]
    const nextColumn = columns[columnIndex + 1]
    if (!nextColumn) return
    event.preventDefault()
    const widths = measureColumnWidths()
    setColumnWidths(widths)
    dragRef.current = {
      leftKey: column.key,
      rightKey: nextColumn.key,
      startX: event.clientX,
      startWidths: widths,
      minLeft: column.minWidth ?? 72,
      minRight: nextColumn.minWidth ?? 72,
      previousCursor: document.body.style.cursor,
      previousUserSelect: document.body.style.userSelect,
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const resizeWithKeyboard = (event: React.KeyboardEvent, columnIndex: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const column = columns[columnIndex]
    const nextColumn = columns[columnIndex + 1]
    if (!nextColumn) return
    event.preventDefault()
    const widths = measureColumnWidths()
    setColumnWidths(resizedWidths(
      widths,
      column.key,
      nextColumn.key,
      event.key === 'ArrowRight' ? 12 : -12,
      column.minWidth ?? 72,
      nextColumn.minWidth ?? 72,
    ))
  }

  return { tableRef, columnWidths, setColumnWidths, startResize, resizeWithKeyboard }
}
