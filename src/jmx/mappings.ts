import type { JMeterComponentType } from '../models/jmeter'

interface ElementMapping {
  tag: string
  guiclass: string
  testclass: string
}

export const typeToElement: Record<Exclude<JMeterComponentType, 'UnsupportedComponent'>, ElementMapping> = {
  TestPlan: { tag: 'TestPlan', guiclass: 'TestPlanGui', testclass: 'TestPlan' },
  UserDefinedVariables: { tag: 'Arguments', guiclass: 'ArgumentsPanel', testclass: 'Arguments' },
  ThreadGroup: { tag: 'ThreadGroup', guiclass: 'ThreadGroupGui', testclass: 'ThreadGroup' },
  HTTPRequestDefaults: { tag: 'ConfigTestElement', guiclass: 'HttpDefaultsGui', testclass: 'ConfigTestElement' },
  HTTPRequest: { tag: 'HTTPSamplerProxy', guiclass: 'HttpTestSampleGui', testclass: 'HTTPSamplerProxy' },
  HTTPHeaderManager: { tag: 'HeaderManager', guiclass: 'HeaderPanel', testclass: 'HeaderManager' },
  HTTPCookieManager: { tag: 'CookieManager', guiclass: 'CookiePanel', testclass: 'CookieManager' },
  CSVDataSet: { tag: 'CSVDataSet', guiclass: 'TestBeanGUI', testclass: 'CSVDataSet' },
  TransactionController: { tag: 'TransactionController', guiclass: 'TransactionControllerGui', testclass: 'TransactionController' },
  IfController: { tag: 'IfController', guiclass: 'IfControllerPanel', testclass: 'IfController' },
  LoopController: { tag: 'LoopController', guiclass: 'LoopControlPanel', testclass: 'LoopController' },
  ConstantTimer: { tag: 'ConstantTimer', guiclass: 'ConstantTimerGui', testclass: 'ConstantTimer' },
  JSONExtractor: { tag: 'JSONPostProcessor', guiclass: 'JSONPostProcessorGui', testclass: 'JSONPostProcessor' },
  RegexExtractor: { tag: 'RegexExtractor', guiclass: 'RegexExtractorGui', testclass: 'RegexExtractor' },
  ResponseAssertion: { tag: 'ResponseAssertion', guiclass: 'AssertionGui', testclass: 'ResponseAssertion' },
  JSR223Sampler: { tag: 'JSR223Sampler', guiclass: 'TestBeanGUI', testclass: 'JSR223Sampler' },
  JSR223PreProcessor: { tag: 'JSR223PreProcessor', guiclass: 'TestBeanGUI', testclass: 'JSR223PreProcessor' },
  JSR223PostProcessor: { tag: 'JSR223PostProcessor', guiclass: 'TestBeanGUI', testclass: 'JSR223PostProcessor' },
  JSR223Assertion: { tag: 'JSR223Assertion', guiclass: 'TestBeanGUI', testclass: 'JSR223Assertion' },
  ViewResultsTree: { tag: 'ResultCollector', guiclass: 'ViewResultsFullVisualizer', testclass: 'ResultCollector' },
  SummaryReport: { tag: 'ResultCollector', guiclass: 'SummaryReport', testclass: 'ResultCollector' },
  AggregateReport: { tag: 'ResultCollector', guiclass: 'StatVisualizer', testclass: 'ResultCollector' },
}

export function mapElementToType(element: Element): JMeterComponentType {
  const tag = element.tagName
  const gui = element.getAttribute('guiclass') ?? ''

  if (tag === 'ConfigTestElement' && /HttpDefaults/i.test(gui)) return 'HTTPRequestDefaults'
  if (tag === 'Arguments') return 'UserDefinedVariables'
  if (tag === 'ResultCollector') {
    if (/ViewResults/i.test(gui)) return 'ViewResultsTree'
    if (/SummaryReport/i.test(gui)) return 'SummaryReport'
    if (/StatVisualizer|Aggregate/i.test(gui)) return 'AggregateReport'
  }

  const entry = (Object.entries(typeToElement) as Array<[Exclude<JMeterComponentType, 'UnsupportedComponent'>, ElementMapping]>).find(
    ([, mapping]) => mapping.tag === tag,
  )
  return entry?.[0] ?? 'UnsupportedComponent'
}
