import { FINAL_SAMPLE_DETAIL_CAP, LIVE_SAMPLE_DETAIL_CAP, LIVE_SUCCESS_SAMPLE_INTERVAL, type JtlSample } from './types'

/** Keeps every failure, the first 100 samples, and every Nth success — capped for SSE payload size. */
export function selectLiveSampleDetails(samples: JtlSample[], offset: number): JtlSample[] {
  const selected: JtlSample[] = []

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index]
    const sampleNumber = offset + index + 1
    if (!sample.success || sampleNumber <= 100 || sampleNumber % LIVE_SUCCESS_SAMPLE_INTERVAL === 0) {
      selected.push(sample)
    }
    if (selected.length >= LIVE_SAMPLE_DETAIL_CAP) break
  }

  return selected
}

export function selectFinalSampleDetails(samples: JtlSample[]): JtlSample[] {
  if (samples.length <= FINAL_SAMPLE_DETAIL_CAP) return samples

  const selected: JtlSample[] = []
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index]
    const sampleNumber = index + 1
    if (!sample.success || sampleNumber <= 100 || sampleNumber % LIVE_SUCCESS_SAMPLE_INTERVAL === 0) {
      selected.push(sample)
    }
    if (selected.length >= FINAL_SAMPLE_DETAIL_CAP) break
  }

  return selected
}
