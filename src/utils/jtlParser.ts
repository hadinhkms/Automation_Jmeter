import type { ParsedJtlResult } from '../models/jtl'
import { parseXmlJtl } from './jtl/xmlJtl'
import { parseCsvJtl } from './jtl/csvJtl'

export type { ParsedJtlResult } from '../models/jtl'

export function parseJtlContent(content: string): ParsedJtlResult {
  if (!content || !content.trim()) {
    return { samples: [], summaryRows: [], aggregateRows: [], errorRate: 0, totalSamples: 0 }
  }

  // Handle XML formatted JTL (<testResults>...</testResults>)
  if (content.trim().startsWith('<')) {
    return parseXmlJtl(content)
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length <= 1) {
    return { samples: [], summaryRows: [], aggregateRows: [], errorRate: 0, totalSamples: 0 }
  }

  return parseCsvJtl(lines)
}
