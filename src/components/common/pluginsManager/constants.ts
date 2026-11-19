import type { JMeterPluginMeta } from '../../../services/jmeterPluginService'

export type TabType = 'installed' | 'available' | 'upgrades'

export type StatusMessage = { type: 'info' | 'error' | 'success'; text: string }

export type SelectedPlugin = JMeterPluginMeta & { installedVersion?: string; jarPath?: string; jarSize?: number; isInstalled?: boolean }

export const CATEGORIES = [
  'All',
  'Thread Groups',
  'Samplers',
  'Timers',
  'Listeners',
  'Functions',
  'Protocols',
  'Core',
] as const

export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
