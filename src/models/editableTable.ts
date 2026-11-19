export interface TableColumn {
  key: string
  label: string
  type?: 'text' | 'checkbox'
  placeholder?: string
  minWidth?: number
}

export type ColumnWidths = Record<string, number>

export interface ColumnDrag {
  leftKey: string
  rightKey: string
  startX: number
  startWidths: ColumnWidths
  minLeft: number
  minRight: number
  previousCursor: string
  previousUserSelect: string
}
