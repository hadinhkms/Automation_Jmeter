import type { TestPlanNode } from '../../models/jmeter'

export type RecorderTab = 'live' | 'har'
export type BrowserChoice = 'chrome' | 'edge' | 'custom'
export type InspectorTab = 'body' | 'headers' | 'query' | 'response' | 'sensitive'
export type TypeFilter = 'ALL' | 'XHR' | 'DOC' | 'STATIC' | 'FAILED'

export interface BrowserRecorderModalProps {
  isOpen: boolean
  targetNode: TestPlanNode
  testPlanRoot: TestPlanNode
  onClose: () => void
  onImport: (nodes: TestPlanNode[], targetParentId: string) => void
}

export interface ContainerOption {
  id: string
  name: string
  type: string
  depth: number
}

export interface RequestFilterState {
  searchText: string
  methodFilter: string
  typeFilter: TypeFilter
  hideStatic: boolean
  hideAnalytics: boolean
}

export interface ImportOptionFlags {
  groupByTx: boolean
  createHeaderMgr: boolean
  createCookieMgr: boolean
  createDefaults: boolean
  cleanHeaders: boolean
  maskSensitive: boolean
  parameterizeSecrets: boolean
}

export const CONTAINER_TYPES = [
  'TestPlan',
  'ThreadGroup',
  'TransactionController',
  'LoopController',
  'WhileController',
  'IfController',
  'TestFragmentController',
]

export const TYPE_FILTERS = ['ALL', 'XHR', 'DOC', 'STATIC', 'FAILED'] as const
export const METHOD_FILTERS = ['ALL', 'GET', 'POST', 'PUT', 'DELETE']
export const INSPECTOR_TABS = ['body', 'headers', 'query', 'response', 'sensitive'] as const

export function typeFilterLabel(t: TypeFilter): string {
  if (t === 'XHR') return 'XHR/Fetch'
  if (t === 'DOC') return 'Doc'
  if (t === 'STATIC') return 'Static'
  if (t === 'FAILED') return 'Failed'
  return 'All Types'
}
