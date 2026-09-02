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
  ConcurrencyThreadGroup: {
    tag: 'com.blazemeter.jmeter.threads.concurrency.ConcurrencyThreadGroup',
    guiclass: 'com.blazemeter.jmeter.threads.concurrency.ConcurrencyThreadGroupGui',
    testclass: 'com.blazemeter.jmeter.threads.concurrency.ConcurrencyThreadGroup',
  },
  SteppingThreadGroup: {
    tag: 'kg.apc.jmeter.threads.SteppingThreadGroup',
    guiclass: 'kg.apc.jmeter.threads.SteppingThreadGroupGui',
    testclass: 'kg.apc.jmeter.threads.SteppingThreadGroup',
  },
  UltimateThreadGroup: {
    tag: 'kg.apc.jmeter.threads.UltimateThreadGroup',
    guiclass: 'kg.apc.jmeter.threads.UltimateThreadGroupGui',
    testclass: 'kg.apc.jmeter.threads.UltimateThreadGroup',
  },
  HTTPRequestDefaults: { tag: 'ConfigTestElement', guiclass: 'HttpDefaultsGui', testclass: 'ConfigTestElement' },
  HTTPRequest: { tag: 'HTTPSamplerProxy', guiclass: 'HttpTestSampleGui', testclass: 'HTTPSamplerProxy' },
  GraphQLSampler: { tag: 'HTTPSamplerProxy', guiclass: 'GraphQLHTTPSamplerGui', testclass: 'HTTPSamplerProxy' },
  WebSocketOpenSampler: {
    tag: 'eu.luminis.jmeter.wssampler.OpenWebSocketSampler',
    guiclass: 'eu.luminis.jmeter.wssampler.OpenWebSocketSamplerGui',
    testclass: 'eu.luminis.jmeter.wssampler.OpenWebSocketSampler',
  },
  WebSocketSingleWriteSampler: {
    tag: 'eu.luminis.jmeter.wssampler.SingleWriteWebSocketSampler',
    guiclass: 'eu.luminis.jmeter.wssampler.SingleWriteWebSocketSamplerGui',
    testclass: 'eu.luminis.jmeter.wssampler.SingleWriteWebSocketSampler',
  },
  WebSocketSingleReadSampler: {
    tag: 'eu.luminis.jmeter.wssampler.SingleReadWebSocketSampler',
    guiclass: 'eu.luminis.jmeter.wssampler.SingleReadWebSocketSamplerGui',
    testclass: 'eu.luminis.jmeter.wssampler.SingleReadWebSocketSampler',
  },
  WebSocketCloseSampler: {
    tag: 'eu.luminis.jmeter.wssampler.CloseWebSocketSampler',
    guiclass: 'eu.luminis.jmeter.wssampler.CloseWebSocketSamplerGui',
    testclass: 'eu.luminis.jmeter.wssampler.CloseWebSocketSampler',
  },
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
  DebugSampler: { tag: 'DebugSampler', guiclass: 'TestBeanGUI', testclass: 'DebugSampler' },
  JSR223Sampler: { tag: 'JSR223Sampler', guiclass: 'TestBeanGUI', testclass: 'JSR223Sampler' },
  JSR223PreProcessor: { tag: 'JSR223PreProcessor', guiclass: 'TestBeanGUI', testclass: 'JSR223PreProcessor' },
  JSR223PostProcessor: { tag: 'JSR223PostProcessor', guiclass: 'TestBeanGUI', testclass: 'JSR223PostProcessor' },
  JSR223Assertion: { tag: 'JSR223Assertion', guiclass: 'TestBeanGUI', testclass: 'JSR223Assertion' },
  ModuleController: { tag: 'ModuleController', guiclass: 'ModuleControllerGui', testclass: 'ModuleController' },
  TestFragmentController: { tag: 'TestFragmentController', guiclass: 'TestFragmentControllerGui', testclass: 'TestFragmentController' },
  BeanShellPostProcessor: { tag: 'BeanShellPostProcessor', guiclass: 'TestBeanGUI', testclass: 'BeanShellPostProcessor' },
  BackendListener: { tag: 'BackendListener', guiclass: 'BackendListenerGui', testclass: 'BackendListener' },
  ViewResultsTree: { tag: 'ResultCollector', guiclass: 'ViewResultsFullVisualizer', testclass: 'ResultCollector' },
  SummaryReport: { tag: 'ResultCollector', guiclass: 'SummaryReport', testclass: 'ResultCollector' },
  AggregateReport: { tag: 'ResultCollector', guiclass: 'StatVisualizer', testclass: 'ResultCollector' },
}

export function mapElementToType(element: Element): JMeterComponentType {
  const tag = element.tagName
  const gui = element.getAttribute('guiclass') ?? ''
  const test = element.getAttribute('testclass') ?? ''

  if (tag === 'ConfigTestElement' && /HttpDefaults/i.test(gui)) return 'HTTPRequestDefaults'
  if (tag === 'Arguments') return 'UserDefinedVariables'
  if (tag === 'ResultCollector') {
    if (/ViewResults/i.test(gui)) return 'ViewResultsTree'
    if (/SummaryReport/i.test(gui)) return 'SummaryReport'
    if (/StatVisualizer|Aggregate/i.test(gui)) return 'AggregateReport'
  }
  if (tag === 'HTTPSamplerProxy') {
    if (/GraphQL/i.test(gui)) return 'GraphQLSampler'
    return 'HTTPRequest'
  }
  if (tag.includes('ConcurrencyThreadGroup') || gui.includes('ConcurrencyThreadGroup')) return 'ConcurrencyThreadGroup'
  if (tag.includes('SteppingThreadGroup') || gui.includes('SteppingThreadGroup')) return 'SteppingThreadGroup'
  if (tag.includes('UltimateThreadGroup') || gui.includes('UltimateThreadGroup')) return 'UltimateThreadGroup'
  if (tag.includes('OpenWebSocketSampler') || gui.includes('OpenWebSocketSampler')) return 'WebSocketOpenSampler'
  if (tag.includes('SingleWriteWebSocketSampler') || gui.includes('SingleWriteWebSocketSampler')) return 'WebSocketSingleWriteSampler'
  if (tag.includes('SingleReadWebSocketSampler') || gui.includes('SingleReadWebSocketSampler')) return 'WebSocketSingleReadSampler'
  if (tag.includes('CloseWebSocketSampler') || gui.includes('CloseWebSocketSampler')) return 'WebSocketCloseSampler'
  if (tag === 'BackendListener' || gui.includes('BackendListener') || test.includes('BackendListener')) return 'BackendListener'

  const entry = (Object.entries(typeToElement) as Array<[Exclude<JMeterComponentType, 'UnsupportedComponent'>, ElementMapping]>).find(
    ([, mapping]) => mapping.tag === tag,
  )
  return entry?.[0] ?? 'UnsupportedComponent'
}

