import type { RecordedRequest } from '../../src/models/recorder'

/** Live view of recorder state handed to CDP event handlers (built per event). */
export interface CdpEventContext {
  requests: RecordedRequest[]
  transaction: string
  autoPageSplit: boolean
  maxRequestsInMemory: number
  nextPageStep(): number
  setTransaction(name: string): void
  emit(event: string, payload?: unknown): boolean
  sendCdp<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>
}

export type CdpParams = Record<string, unknown>
