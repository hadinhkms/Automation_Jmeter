import type { JMeterStore } from '../models/jmeterStore'

export type ActiveModal =
  | 'templates'
  | 'workload'
  | 'sla'
  | 'git'
  | 'assets'
  | 'recorder'
  | 'curl'
  | 'postman'
  | 'mock'
  | 'ddt'
  | 'plugins'
  | 'settings'
  | 'save'
  | null

export type AppStore = JMeterStore

export interface AppNotice {
  type: 'error' | 'info'
  message: string
}

export type NotifyFn = (message: string, type?: 'error' | 'info') => void
