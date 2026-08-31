import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { TableRow } from '../../models/jmeter'

export interface TableColumn {
  key: string
  label: string
  type?: 'text' | 'checkbox'
  placeholder?: string
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
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
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
