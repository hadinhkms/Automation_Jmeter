import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { TableRow } from '../../models/jmeter'

export interface TableColumn {
  key: string
  label: string
  type?: 'text' | 'checkbox'
  placeholder?: string
  minWidth?: number
}

type ColumnWidths = Record<string, number>

interface ColumnDrag {
  leftKey: string
  rightKey: string
  startX: number
  startWidths: ColumnWidths
  minLeft: number
  minRight: number
  previousCursor: string
  previousUserSelect: string
}

export function EditableTable({
  columns,
  rows,
  onChange,
  newRow,
  compact = false,
}: {
  columns: TableColumn[]
  rows: TableRow[]
  onChange: (rows: TableRow[]) => void
  newRow: TableRow
  compact?: boolean
}) {
  const tableRef = useRef<HTMLTableElement>(null)
  const dragRef = useRef<ColumnDrag | null>(null)
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({})

  const measureColumnWidths = () => {
    const widths: ColumnWidths = {}
    tableRef.current?.querySelectorAll<HTMLElement>('th[data-column-key]').forEach((header) => {
      const key = header.dataset.columnKey
      if (key) widths[key] = header.getBoundingClientRect().width
    })
    return widths
  }

  const resizedWidths = (
    startWidths: ColumnWidths,
    leftKey: string,
    rightKey: string,
    requestedDelta: number,
    minLeft: number,
    minRight: number,
  ) => {
    const leftWidth = startWidths[leftKey]
    const rightWidth = startWidths[rightKey]
    const delta = Math.max(minLeft - leftWidth, Math.min(requestedDelta, rightWidth - minRight))
    return {
      ...startWidths,
      [leftKey]: leftWidth + delta,
      [rightKey]: rightWidth - delta,
    }
  }

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

  const updateCell = (index: number, key: string, value: string | boolean) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)))
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rows.length) return
    const next = [...rows]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className={`editable-table ${compact ? 'compact' : ''}`}>
      <div className="table-scroll">
        <table ref={tableRef}>
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={columnWidths[column.key] ? { width: `${columnWidths[column.key]}px` } : undefined} />
            ))}
            <col className="row-actions-column" />
          </colgroup>
          <thead>
            <tr>
              {columns.map((column, columnIndex) => (
                <th key={column.key} data-column-key={column.key}>
                  {column.label}
                  {columnIndex < columns.length - 1 ? (
                    <button
                      type="button"
                      className="column-resize-handle"
                      aria-label={`Resize ${column.label} column`}
                      title="Drag to resize column; double-click to reset"
                      onPointerDown={(event) => startResize(event, columnIndex)}
                      onKeyDown={(event) => resizeWithKeyboard(event, columnIndex)}
                      onDoubleClick={() => setColumnWidths({})}
                    />
                  ) : null}
                </th>
              ))}
              <th className="row-actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="empty-table-cell">
                  No rows configured
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.type === 'checkbox' ? (
                        <input
                          type="checkbox"
                          aria-label={`${column.label}, row ${index + 1}`}
                          checked={Boolean(row[column.key])}
                          onChange={(event) => updateCell(index, column.key, event.target.checked)}
                        />
                      ) : (
                        <input
                          type="text"
                          aria-label={`${column.label}, row ${index + 1}`}
                          value={String(row[column.key] ?? '')}
                          placeholder={column.placeholder}
                          onChange={(event) => updateCell(index, column.key, event.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="row-actions">
                    <button type="button" title="Move row up" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" title="Move row down" onClick={() => move(index, 1)} disabled={index === rows.length - 1}>
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" title="Delete row" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <button type="button" className="text-button" onClick={() => onChange([...rows, { ...newRow }])}>
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  )
}
