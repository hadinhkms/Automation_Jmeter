import { browserRecorderService } from '../../services/browserRecorderService'
import { parseHarContent } from '../../utils/harParser'
import { errorMessage } from './recorderLogic'
import type { RecorderSessionModel } from './useRecorderSession'

/** Live-recording and HAR-loading handlers (start, stop, step switch, clear, HAR file). */
export function useRecordingActions(s: RecorderSessionModel) {
  // Start live recording
  const handleStartRecording = async () => {
    if (s.isStarting || s.isRecording) return
    s.setIsStarting(true)
    s.setErrorNotice(null)

    try {
      await browserRecorderService.startRecording({
        browserType: s.selectedBrowser,
        targetUrl: s.targetUrl.trim() || 'https://google.com',
        initialTransaction: s.currentTransaction.trim() || '01_Open_Application',
        autoPageSplit: s.autoPageSplit,
      })
    } catch (err) {
      s.setIsStarting(false)
      s.setErrorNotice(errorMessage(err, 'Could not start browser recording.'))
    }
  }

  // Stop live recording
  const handleStopRecording = async () => {
    try {
      await browserRecorderService.stopRecording()
      s.setIsRecording(false)
    } catch (err) {
      s.setErrorNotice(errorMessage(err, 'Failed to stop recording.'))
    }
  }

  // Advance to next transaction step
  const handleAddTransactionStep = async () => {
    const nextName = s.nextTransactionInput.trim()
    if (!nextName) return
    try {
      await browserRecorderService.setTransaction(nextName)
      s.setCurrentTransaction(nextName)
      s.setNextTransactionInput('')
    } catch (err) {
      s.setErrorNotice(errorMessage(err, 'Failed to set transaction.'))
    }
  }

  // Clear recorded list
  const handleClear = async () => {
    try {
      await browserRecorderService.clearRecorded()
      s.setRequests([])
      s.setSelectedReqIds(new Set())
      s.setInspectedReqId(null)
    } catch (err) {
      s.setErrorNotice(errorMessage(err, 'Failed to clear requests.'))
    }
  }

  // Handle HAR file upload / drop
  const handleHarFile = async (file: File) => {
    try {
      const text = await file.text()
      const result = parseHarContent(text)
      if (!result.success || result.requests.length === 0) {
        s.setErrorNotice(result.error || 'No valid HTTP requests found in HAR file.')
        return
      }
      s.setHarFileName(file.name)
      s.setRequests(result.requests)
      s.setSelectedReqIds(new Set(result.requests.map((r) => r.id)))
      if (result.requests.length > 0) {
        s.setInspectedReqId(result.requests[0].id)
      }
      s.setErrorNotice(null)
    } catch (err) {
      s.setErrorNotice(errorMessage(err, 'Failed to read HAR file.'))
    }
  }

  return { handleStartRecording, handleStopRecording, handleAddTransactionStep, handleClear, handleHarFile }
}
