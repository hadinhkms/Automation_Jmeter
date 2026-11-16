// Public entry for the JMeter CLI runner. Implementation lives in ./runner/*.
import { JMeterRunner } from './runner/runnerCore'

export type { JMeterDetectionResult } from './jmeterDetection'
export type { JtlSample, RunProgressMetrics, RunSummary, RunSamplesUpdate } from './runner/types'
export { parseVrtXml } from './runner/vrtParser'
export { JMeterRunner }

export const jmeterRunner = new JMeterRunner()
