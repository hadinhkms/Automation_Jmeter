import type { ColumnWidths } from '../../../models/editableTable'

export function measureColumnWidths(table: HTMLTableElement | null) {
  const widths: ColumnWidths = {}
  table?.querySelectorAll<HTMLElement>('th[data-column-key]').forEach((header) => {
    const key = header.dataset.columnKey
    if (key) widths[key] = header.getBoundingClientRect().width
  })
  return widths
}

export function resizedWidths(
  startWidths: ColumnWidths,
  leftKey: string,
  rightKey: string,
  requestedDelta: number,
  minLeft: number,
  minRight: number,
) {
  const leftWidth = startWidths[leftKey]
  const rightWidth = startWidths[rightKey]
  const delta = Math.max(minLeft - leftWidth, Math.min(requestedDelta, rightWidth - minRight))
  return {
    ...startWidths,
    [leftKey]: leftWidth + delta,
    [rightKey]: rightWidth - delta,
  }
}
