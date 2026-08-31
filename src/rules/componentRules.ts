import type { JMeterComponentType } from '../models/jmeter'

export const componentGroups = {
  Threads: ['ThreadGroup'],
  Sampler: ['HTTPRequest', 'JSR223Sampler'],
  'Logic Controller': [
    'IfController',
    'LoopController',
    'TransactionController',
  ],
  'Config Element': [
    'UserDefinedVariables',
    'HTTPRequestDefaults',
    'HTTPHeaderManager',
    'HTTPCookieManager',
    'CSVDataSet',
  ],
  Timer: ['ConstantTimer'],
  'Pre Processor': ['JSR223PreProcessor'],
  'Post Processor': [
    'JSONExtractor',
    'RegexExtractor',
    'JSR223PostProcessor',
  ],
  Assertion: ['ResponseAssertion', 'JSR223Assertion'],
  Listener: ['ViewResultsTree', 'SummaryReport', 'AggregateReport'],
} satisfies Record<string, JMeterComponentType[]>

const samplerTypes = new Set<JMeterComponentType>([
  'HTTPRequest',
  'JSR223Sampler',
])
const controllerTypes = new Set<JMeterComponentType>([
  'IfController',
  'LoopController',
  'TransactionController',
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
])
const assertionTypes = new Set<JMeterComponentType>([
  'ResponseAssertion',
  'JSR223Assertion',
])
const listenerTypes = new Set<JMeterComponentType>([
  'ViewResultsTree',
  'SummaryReport',
  'AggregateReport',
])

export function canAddChild(
  parentType: JMeterComponentType,
  childType: JMeterComponentType,
): boolean {
  if (parentType === 'TestPlan') {
    return childType === 'ThreadGroup' || childType === 'UserDefinedVariables'
  }

  if (parentType === 'ThreadGroup') {
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

  if (controllerTypes.has(parentType)) {
    return (
      samplerTypes.has(childType) ||
      controllerTypes.has(childType) ||
      configTypes.has(childType) ||
      childType === 'ConstantTimer' ||
      processorTypes.has(childType) ||
      assertionTypes.has(childType)
    )
  }

  if (samplerTypes.has(parentType)) {
    return (
      childType === 'ConstantTimer' ||
      processorTypes.has(childType) ||
      assertionTypes.has(childType)
    )
  }

  return false
}
