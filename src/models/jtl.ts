import type { JtlSample } from '../services/jmeterRunnerService'

export interface ParsedJtlResult {
  samples: JtlSample[]
  summaryRows: string[][]
  aggregateRows: string[][]
  errorRate: number
  totalSamples: number
}
