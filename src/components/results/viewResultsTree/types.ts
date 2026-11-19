import type { JtlSample } from '../../../services/jmeterRunnerService'

export interface ViewResultsTreeProps {
  samples: JtlSample[]
  isReal?: boolean
  activeRunId?: string | null
}

export type MainTab = 'sampler-result' | 'request' | 'response'
export type RequestSubTab = 'body' | 'headers' | 'curl' | 'url' | 'raw'
export type ResponseSubTab = 'body' | 'cookies' | 'headers' | 'tests'
export type ResponseRenderer = 'json' | 'curl-response' | 'text' | 'html' | 'xml' | 'headers'

export interface UrlInfo {
  protocol: string
  host: string
  pathname: string
  params: { key: string; value: string }[]
}

export interface HeaderEntry {
  name: string
  value: string
}

export const SAMPLE_ROW_HEIGHT = 32
export const SAMPLE_OVERSCAN_ROWS = 12
