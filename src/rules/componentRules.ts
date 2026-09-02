import type { JMeterComponentType } from '../models/jmeter'

export const componentGroups = {
  'Threads (Users)': [
    'ThreadGroup',
    'ConcurrencyThreadGroup',
    'SteppingThreadGroup',
    'UltimateThreadGroup',
  ],
  'Config Element': [
    'HTTPRequestDefaults',
    'HTTPHeaderManager',
    'HTTPCookieManager',
    'CSVDataSet',
    'UserDefinedVariables',
  ],
  'Listener': [
    'ViewResultsTree',
    'SummaryReport',
    'AggregateReport',
    'BackendListener',
  ],
  'Timer': ['ConstantTimer'],
  'Pre Processors': ['JSR223PreProcessor', 'UserDefinedVariables'],
  'Post Processors': [
    'JSONExtractor',
    'RegexExtractor',
    'JSR223PostProcessor',
  ],
  'Assertions': ['ResponseAssertion', 'JSR223Assertion'],
  'Logic Controller': [
    'TransactionController',
    'IfController',
    'LoopController',
    'ModuleController',
    'TestFragmentController',
  ],
  'Sampler': [
    'HTTPRequest',
    'GraphQLSampler',
    'WebSocketOpenSampler',
    'WebSocketSingleWriteSampler',
    'WebSocketSingleReadSampler',
    'WebSocketCloseSampler',
    'JSR223Sampler',
    'DebugSampler',
  ],
} satisfies Record<string, JMeterComponentType[]>

const threadGroupTypes = new Set<JMeterComponentType>([
  'ThreadGroup',
  'ConcurrencyThreadGroup',
  'SteppingThreadGroup',
  'UltimateThreadGroup',
])

const samplerTypes = new Set<JMeterComponentType>([
  'HTTPRequest',
  'GraphQLSampler',
  'WebSocketOpenSampler',
  'WebSocketSingleWriteSampler',
  'WebSocketSingleReadSampler',
  'WebSocketCloseSampler',
  'JSR223Sampler',
  'DebugSampler',
])
const controllerTypes = new Set<JMeterComponentType>([
  'IfController',
  'LoopController',
  'TransactionController',
  'ModuleController',
  'TestFragmentController',
])
const configTypes = new Set<JMeterComponentType>([
  'UserDefinedVariables',
  'HTTPRequestDefaults',
  'HTTPHeaderManager',
  'HTTPCookieManager',
  'CSVDataSet',
])
const processorTypes = new Set<JMeterComponentType>([
  'JSONExtractor',
  'RegexExtractor',
  'JSR223PreProcessor',
  'JSR223PostProcessor',
  'BeanShellPostProcessor',
])
const assertionTypes = new Set<JMeterComponentType>([
  'ResponseAssertion',
  'JSR223Assertion',
])
const listenerTypes = new Set<JMeterComponentType>([
  'ViewResultsTree',
  'SummaryReport',
  'AggregateReport',
  'BackendListener',
])

export function canAddChild(
  parentType: JMeterComponentType,
  childType: JMeterComponentType,
): boolean {
  if (parentType === 'TestPlan') {
    return (
      threadGroupTypes.has(childType) ||
      configTypes.has(childType) ||
      listenerTypes.has(childType) ||
      childType === 'ConstantTimer' ||
      processorTypes.has(childType) ||
      assertionTypes.has(childType) ||
      childType === 'TestFragmentController'
    )
  }

  if (threadGroupTypes.has(parentType) || controllerTypes.has(parentType)) {
    return (
      samplerTypes.has(childType) ||
      controllerTypes.has(childType) ||
      configTypes.has(childType) ||
      childType === 'ConstantTimer' ||
      processorTypes.has(childType) ||
      assertionTypes.has(childType) ||
      listenerTypes.has(childType)
    )
  }

  if (samplerTypes.has(parentType)) {
    return (
      childType === 'ConstantTimer' ||
      processorTypes.has(childType) ||
      assertionTypes.has(childType) ||
      listenerTypes.has(childType) ||
      childType === 'HTTPHeaderManager' ||
      childType === 'HTTPCookieManager'
    )
  }

  return false
}


