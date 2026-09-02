import type { TestPlanNode } from '../models/jmeter'
import { browserJmxParser } from '../jmx/parser'
import { browserJmxWriter } from '../jmx/writer'

export interface ProjectService {
  openJmx(file: File): Promise<TestPlanNode>
  openJmxFromText(text: string): Promise<TestPlanNode>
  exportJmx(testPlan: TestPlanNode): Promise<string>
}

export const localProjectService: ProjectService = {
  async openJmx(file) {
    return browserJmxParser.parse(await file.text())
  },
  async openJmxFromText(text) {
    return browserJmxParser.parse(text)
  },
  async exportJmx(testPlan) {
    return browserJmxWriter.write(testPlan)
  },
}
