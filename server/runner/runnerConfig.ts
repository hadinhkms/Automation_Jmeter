import { EventEmitter } from 'node:events'
import { detectJMeterInstall, type JMeterDetectionResult } from '../jmeterDetection'
import { findCompatibleJavaHome } from './runEnvironment'
import { DEFAULT_HEAP } from './types'

/** JMeter/Java/heap configuration + cached JMeter detection; base of JMeterRunner. */
export class JMeterRunnerConfig extends EventEmitter {
  protected customPath: string = ''
  protected customJavaHome: string = ''
  protected customHeap: string = ''
  private detectionCache: JMeterDetectionResult | null = null
  private detectionInFlight: Promise<JMeterDetectionResult> | null = null

  public setCustomPath(path: string) {
    this.customPath = path.trim()
    this.detectionCache = null
  }

  public getCustomPath(): string {
    return this.customPath
  }

  public setCustomJavaHome(path: string) {
    this.customJavaHome = path.trim()
    this.detectionCache = null
  }

  public getCustomJavaHome(): string {
    return this.customJavaHome
  }

  public setCustomHeap(heap: string) {
    this.customHeap = heap.trim()
    this.detectionCache = null
  }

  public getCustomHeap(): string {
    return this.customHeap
  }

  public getCompatibleJavaHome(): string | null {
    return findCompatibleJavaHome(this.customJavaHome)
  }

  /** Non-blocking JMeter detection; a successful result is cached until the configuration changes. */
  public detectJMeter(force = false): Promise<JMeterDetectionResult> {
    if (!force && this.detectionCache?.found) return Promise.resolve(this.detectionCache)
    if (!force && this.detectionInFlight) return this.detectionInFlight
    const pending: Promise<JMeterDetectionResult> = detectJMeterInstall({
      customPath: this.customPath,
      javaHome: this.getCompatibleJavaHome(),
      heap: this.customHeap || process.env.HEAP || DEFAULT_HEAP,
    })
      .then((result) => {
        // Ignore a stale result if a newer (forced) detection started meanwhile
        if (this.detectionInFlight === pending) this.detectionCache = result
        return result
      })
      .finally(() => {
        if (this.detectionInFlight === pending) this.detectionInFlight = null
      })
    this.detectionInFlight = pending
    return pending
  }
}
