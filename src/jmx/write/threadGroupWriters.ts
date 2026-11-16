import type { TestPlanNode } from '../../models/jmeter'
import { appendArguments } from './argumentWriters'
import type { ComponentWriter } from './types'
import { appendCollection, createElementProp, propertySink, rows, stringProp, value } from './xmlPrimitives'
import type { XmlDocument } from './xmlPrimitives'

function writeThreadGroup(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  const p = propertySink(documentNode, element)
  p.str('ThreadGroup.on_sample_error', value(node, 'onError', 'continue'))
  const loop = createElementProp(documentNode, 'ThreadGroup.main_controller', 'LoopController', 'LoopControlPanel', 'LoopController')
  loop.setAttribute('testname', 'Loop Controller')
  loop.setAttribute('enabled', 'true')
  const loopProps = propertySink(documentNode, loop)
  loopProps.bool('LoopController.continue_forever', false)
  loopProps.str('LoopController.loops', value(node, 'loops', 1))
  element.appendChild(loop)
  p.str('ThreadGroup.num_threads', value(node, 'threads', 1))
  p.str('ThreadGroup.ramp_time', value(node, 'rampUp', 1))
  p.bool('ThreadGroup.same_user_on_next_iteration', value(node, 'sameUser', true))
  p.bool('ThreadGroup.delayedStart', value(node, 'delayedStart', false))
  p.bool('ThreadGroup.scheduler', value(node, 'scheduler', false))
  p.str('ThreadGroup.duration', value(node, 'duration', 0))
  p.str('ThreadGroup.delay', value(node, 'startupDelay', 0))
}

function writeUltimateSchedule(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  const scheduleRows = rows(node, 'scheduleRows')
  const collection = documentNode.createElement('collectionProp')
  collection.setAttribute('name', 'ultimatethreadgroupdata')
  scheduleRows.forEach((row, index) => {
    const item = documentNode.createElement('collectionProp')
    item.setAttribute('name', String(index))
    stringProp(documentNode, item, '0', row.startThreads || '100')
    stringProp(documentNode, item, '1', row.initialDelay || '0')
    stringProp(documentNode, item, '2', row.startupTime || '30')
    stringProp(documentNode, item, '3', row.holdLoadTime || '300')
    stringProp(documentNode, item, '4', row.shutdownTime || '10')
    collection.appendChild(item)
  })
  element.appendChild(collection)
}

/** Test plan, user defined variables and all thread group flavours. */
export const writeThreadGroupComponent: ComponentWriter = (documentNode, element, node, type) => {
  const p = propertySink(documentNode, element)
  switch (type) {
    case 'TestPlan':
      p.bool('TestPlan.functional_mode', value(node, 'functionalMode', false))
      p.bool('TestPlan.tearDown_on_shutdown', value(node, 'tearDownAfterShutdown', true))
      p.bool('TestPlan.serialize_threadgroups', value(node, 'serializeThreadGroups', false))
      appendArguments(documentNode, element, rows(node, 'variables'), 'TestPlan.user_defined_variables')
      return true
    case 'UserDefinedVariables':
      appendCollection(documentNode, element, 'Arguments.arguments', 'Argument', rows(node, 'variables'), [
        { key: 'name', property: 'Argument.name' },
        { key: 'value', property: 'Argument.value' },
        { key: 'description', property: 'Argument.desc' },
      ])
      return true
    case 'ThreadGroup':
      writeThreadGroup(documentNode, element, node)
      return true
    case 'ConcurrencyThreadGroup':
      p.str('ThreadGroup.on_sample_error', value(node, 'onError', 'continue'))
      p.str('TargetLevel', value(node, 'targetConcurrency', 50))
      p.str('RampUp', value(node, 'rampUpTime', 60))
      p.str('Steps', value(node, 'rampUpSteps', 5))
      p.str('Hold', value(node, 'holdRateTime', 300))
      p.str('LogFilename', value(node, 'logFilename', ''))
      p.str('Iterations', value(node, 'iterations', ''))
      p.str('Unit', value(node, 'timeUnit', 'S'))
      return true
    case 'SteppingThreadGroup':
      p.str('ThreadGroup.on_sample_error', value(node, 'onError', 'continue'))
      p.str('ThreadGroup.num_threads', value(node, 'numThreads', 100))
      p.str('Threads initial delay', value(node, 'firstWaitSeconds', 0))
      p.str('Start users count', value(node, 'initialThreads', 10))
      p.str('Start users count burst', value(node, 'thenAddThreads', 10))
      p.str('Start users period', value(node, 'everySeconds', 30))
      p.str('flighttime', value(node, 'holdSeconds', 300))
      p.str('rampUp', value(node, 'rampUpSeconds', 5))
      p.str('Stop users count', value(node, 'thenStopThreads', 5))
      p.str('Stop users period', value(node, 'stopEverySeconds', 5))
      return true
    case 'UltimateThreadGroup':
      p.str('ThreadGroup.on_sample_error', value(node, 'onError', 'continue'))
      writeUltimateSchedule(documentNode, element, node)
      return true
    default:
      return false
  }
}
