export interface SteppingParams {
  numThreads: number
  firstWait: number
  initialThreads: number
  thenAddThreads: number
  everySeconds: number
  rampUpSeconds: number
  holdSeconds: number
  thenStopThreads: number
  stopEverySeconds: number
}

export function buildSteppingPoints({
  numThreads, firstWait, initialThreads, thenAddThreads, everySeconds, rampUpSeconds, holdSeconds, thenStopThreads, stopEverySeconds,
}: SteppingParams): { time: number; vus: number }[] {
  const pts: { time: number; vus: number }[] = [{ time: 0, vus: 0 }]
  let curTime = 0
  let curVus = 0

  if (firstWait > 0) {
    curTime += firstWait
    pts.push({ time: curTime, vus: 0 })
  }

  if (initialThreads > 0) {
    curVus = Math.min(initialThreads, numThreads)
    pts.push({ time: curTime, vus: curVus })
  }

  while (curVus < numThreads) {
    curTime += rampUpSeconds
    curVus = Math.min(curVus + thenAddThreads, numThreads)
    pts.push({ time: curTime, vus: curVus })
    if (curVus < numThreads) {
      curTime += everySeconds
      pts.push({ time: curTime, vus: curVus })
    }
  }

  if (holdSeconds > 0) {
    curTime += holdSeconds
    pts.push({ time: curTime, vus: numThreads })
  }

  while (curVus > 0) {
    curTime += stopEverySeconds
    curVus = Math.max(0, curVus - thenStopThreads)
    pts.push({ time: curTime, vus: curVus })
  }

  return pts
}
