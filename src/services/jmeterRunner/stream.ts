import type { StreamCallbacks } from '../../models/jmeterRunner'

export function connectRunnerStream(callbacks: StreamCallbacks): () => void {
  if (typeof EventSource === 'undefined') {
    return () => {}
  }

  const es = new EventSource('/api/jmeter/stream')

  es.addEventListener('start', (event) => {
    try {
      const data = JSON.parse(event.data)
      callbacks.onStart?.(data)
    } catch {
      // ignore
    }
  })

  es.addEventListener('log', (event) => {
    try {
      const data = JSON.parse(event.data)
      callbacks.onLog?.(data.line, data.type)
    } catch {
      // ignore
    }
  })

  es.addEventListener('progress', (event) => {
    try {
      const data = JSON.parse(event.data)
      callbacks.onProgress?.(data.metrics)
    } catch {
      // ignore
    }
  })

  es.addEventListener('samples', (event) => {
    try {
      const data = JSON.parse(event.data)
      callbacks.onSamples?.(data)
    } catch {
      // ignore
    }
  })

  es.addEventListener('complete', (event) => {
    try {
      const data = JSON.parse(event.data)
      callbacks.onComplete?.(data)
    } catch {
      // ignore
    }
  })

  es.addEventListener('stopped', () => {
    callbacks.onStopped?.()
  })

  es.addEventListener('error', (event) => {
    try {
      // SAFETY: server-sent "error" events are MessageEvents; plain transport errors throw and are caught
      const data = JSON.parse((event as MessageEvent).data)
      callbacks.onError?.(data.error || 'Runner stream error')
    } catch {
      // ignore
    }
  })

  return () => {
    es.close()
  }
}
