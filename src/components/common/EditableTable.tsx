import { Plus } from 'lucide-react'
import type { TableRow } from '../../models/jmeter'
import type { TableColumn } from '../../models/editableTable'
import { useColumnResize } from './editableTable/useColumnResize'
import { EditableTableBody } from './editableTable/EditableTableBody'

export type { TableColumn }

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
  const { tableRef, columnWidths, setColumnWidths, startResize, resizeWithKeyboard } = useColumnResize(columns)

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
          <EditableTableBody columns={columns} rows={rows} onChange={onChange} />
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
