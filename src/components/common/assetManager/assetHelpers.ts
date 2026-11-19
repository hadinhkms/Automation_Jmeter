export type AssetDir = 'data' | 'downloads' | 'attachments'

export const assetDirs: Array<{ value: AssetDir; label: string }> = [
  { value: 'data', label: 'CSV / Data' },
  { value: 'attachments', label: 'Attachments' },
  { value: 'downloads', label: 'Downloads' },
]

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, unitIndex)).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function formatDate(ms: number): string {
  if (!ms) return '-'
  return new Date(ms).toLocaleString()
}
