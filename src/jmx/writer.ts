import type { TestPlanNode } from '../models/jmeter'
import { serializeNodeWithPreservation } from './write/serializeNode'

export interface JmxWriter {
  write(testPlan: TestPlanNode): string
}

export const browserJmxWriter: JmxWriter = {
  write(testPlan) {
    const header = '<?xml version="1.0" encoding="UTF-8"?>\n<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">\n  <hashTree>\n'
    const body = serializeNodeWithPreservation(testPlan, 4)
    const footer = '  </hashTree>\n</jmeterTestPlan>'
    return header + body + footer
  },
}
