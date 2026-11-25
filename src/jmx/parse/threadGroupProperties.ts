import type { TableRow } from '../../models/jmeter'
import { normalizeDirectoryVariableRows } from '../../utils/jmeterPathVariables'
import { boolProp, collectionRows, countProp, namedElement, numProp, prop } from './domReaders'
import type { PropertyParser } from './types'

const ARGUMENT_FIELDS = { name: 'Argument.name', value: 'Argument.value', description: 'Argument.desc' }

function variableRows(element: Element): TableRow[] {
  return normalizeDirectoryVariableRows(collectionRows(element, 'Arguments.arguments', ARGUMENT_FIELDS))
}

function ultimateScheduleRows(element: Element): TableRow[] {
  const scheduleCollection = namedElement(element, 'ultimatethreadgroupdata')
  const scheduleRows: TableRow[] = []
  if (scheduleCollection) {
    Array.from(scheduleCollection.children).forEach((coll) => {
      const cell = (name: string) => Array.from(coll.children).find((c) => c.getAttribute('name') === name)?.textContent
      const startThreads = cell('0') || '100'
      const initialDelay = cell('1') || '0'
      const startupTime = cell('2') || '30'
      const holdLoadTime = cell('3') || '300'
      const shutdownTime = cell('4') || '10'
      scheduleRows.push({ startThreads, initialDelay, startupTime, holdLoadTime, shutdownTime })
    })
  }
  return scheduleRows
}

/** Test plan, user defined variables and all thread group flavours. */
export const parseThreadGroupProperties: PropertyParser = (element, type, common) => {
  switch (type) {
    case 'TestPlan':
      return {
        ...common,
        variables: variableRows(element),
        functionalMode: boolProp(element, 'TestPlan.functional_mode'),
        tearDownAfterShutdown: boolProp(element, 'TestPlan.tearDown_on_shutdown', true),
        serializeThreadGroups: boolProp(element, 'TestPlan.serialize_threadgroups'),
      }
    case 'UserDefinedVariables':
      return { ...common, variables: variableRows(element) }
    case 'ThreadGroup':
      return {
        ...common,
        onError: prop(element, 'ThreadGroup.on_sample_error', 'continue'),
        threads: numProp(element, 'ThreadGroup.num_threads', 1),
        rampUp: numProp(element, 'ThreadGroup.ramp_time', 1),
        loops: countProp(element, 'LoopController.loops', 1),
        sameUser: boolProp(element, 'ThreadGroup.same_user_on_next_iteration', true),
        delayedStart: boolProp(element, 'ThreadGroup.delayedStart'),
        scheduler: boolProp(element, 'ThreadGroup.scheduler'),
        duration: numProp(element, 'ThreadGroup.duration', 0),
        startupDelay: numProp(element, 'ThreadGroup.delay', 0),
      }
    case 'ConcurrencyThreadGroup':
      return {
        ...common,
        onError: prop(element, 'ThreadGroup.on_sample_error', 'continue'),
        targetConcurrency: numProp(element, 'TargetLevel', 50),
        rampUpTime: numProp(element, 'RampUp', 60),
        rampUpSteps: numProp(element, 'Steps', 5),
        holdRateTime: numProp(element, 'Hold', 300),
        logFilename: prop(element, 'LogFilename', ''),
        iterations: prop(element, 'Iterations', ''),
        timeUnit: prop(element, 'Unit', 'S'),
      }
    case 'SteppingThreadGroup':
      return {
        ...common,
        onError: prop(element, 'ThreadGroup.on_sample_error', 'continue'),
        numThreads: numProp(element, 'ThreadGroup.num_threads', 100),
        firstWaitSeconds: numProp(element, 'Threads initial delay', 0),
        initialThreads: numProp(element, 'Start users count', 10),
        thenAddThreads: numProp(element, 'Start users count burst', 10),
        everySeconds: numProp(element, 'Start users period', 30),
        holdSeconds: numProp(element, 'flighttime', 300),
        rampUpSeconds: numProp(element, 'rampUp', 5),
        thenStopThreads: numProp(element, 'Stop users count', 5),
        stopEverySeconds: numProp(element, 'Stop users period', 5),
      }
    case 'UltimateThreadGroup': {
      const scheduleRows = ultimateScheduleRows(element)
      return {
        ...common,
        onError: prop(element, 'ThreadGroup.on_sample_error', 'continue'),
        scheduleRows: scheduleRows.length > 0 ? scheduleRows : [
          { startThreads: '100', initialDelay: '0', startupTime: '30', holdLoadTime: '300', shutdownTime: '10' },
        ],
      }
    }
    default:
      return undefined
  }
}
