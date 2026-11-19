import type { JtlSample } from '../../../services/jmeterRunnerService'

/** Save the selected sample's response body as a JSON file. */
export function downloadResponse(selectedSample: JtlSample | undefined, responseBody: string): void {
  if (!selectedSample) return
  const content = responseBody || selectedSample.response || ''
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `response_${selectedSample.label.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
