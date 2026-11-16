import type { JMeterComponentType } from '../../models/jmeter'

/** Default properties for Test Plan, variables and thread groups. Returns undefined for types handled elsewhere. */
export function planDefaults(
  type: JMeterComponentType,
  common: { comments: string },
): Record<string, unknown> | undefined {
  switch (type) {
    case 'TestPlan':
      return {
        ...common,
        variables: [],
        functionalMode: false,
        tearDownAfterShutdown: true,
        serializeThreadGroups: false,
      }
    case 'UserDefinedVariables':
      return { ...common, variables: [{ name: 'baseUrl', value: 'https://api.example.com', description: '' }] }
    case 'ThreadGroup':
      return {
        ...common,
        onError: 'continue',
        threads: 1,
        rampUp: 1,
        loops: 1,
        sameUser: true,
        delayedStart: false,
        scheduler: false,
        duration: 0,
        startupDelay: 0,
      }
    case 'ConcurrencyThreadGroup':
      return {
        ...common,
        targetConcurrency: 50,
        rampUpTime: 60,
        rampUpSteps: 5,
        holdRateTime: 300,
        timeUnit: 'S',
        iterations: '',
        logFilename: '',
      }
    case 'SteppingThreadGroup':
      return {
        ...common,
        numThreads: 100,
        firstWaitSeconds: 0,
        initialThreads: 10,
        thenAddThreads: 10,
        everySeconds: 30,
        rampUpSeconds: 5,
        holdSeconds: 300,
        thenStopThreads: 5,
        stopEverySeconds: 5,
      }
    case 'UltimateThreadGroup':
      return {
        ...common,
        scheduleRows: [
          { startThreads: '100', initialDelay: '0', startupTime: '30', holdLoadTime: '300', shutdownTime: '10' },
        ],
      }
    default:
      return undefined
  }
}
