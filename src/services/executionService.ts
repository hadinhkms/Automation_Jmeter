import type { TestPlanNode } from '../models/jmeter'

export interface ExecutionService {
  start(testPlan: TestPlanNode): Promise<void>
  stop(): Promise<void>
}

export const mockExecutionService: ExecutionService = {
  async start() {
    return Promise.resolve()
  },
  async stop() {
    return Promise.resolve()
  },
}
