import { useRef, useState } from 'react'
import type { TestPlanNode } from '../../../models/jmeter'
import { createNode } from '../../../mock/sampleTestPlan'
import { projectAssetService } from '../../../services/projectAssetService'
import { parseCsvPreview, validateCsvFile, type CsvPreview } from '../../../utils/ddt/csvPreviewParser'
import { SHARE_MODE_ALL } from '../../../utils/ddt/csvShareMode'
import { findConflictingAsset, overwritePrompt } from '../../../utils/ddt/csvAssetConflict'
import { buildCsvDataSetProperties, toVariableName, validateVariableNames, type CsvDataSetOptions } from '../../../utils/ddt/csvVariableMapping'

export type DdtRunOptions = Pick<CsvDataSetOptions, 'recycle' | 'stopThread' | 'sharingMode'>

const DEFAULT_OPTIONS: DdtRunOptions = { recycle: true, stopThread: false, sharingMode: SHARE_MODE_ALL }

/** State for the DDT wizard: read + preview the CSV, map columns, upload and build the CSVDataSet node. */
export function useDdtWizard() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [varNames, setVarNames] = useState<string[]>([])
  const [options, setOptions] = useState<DdtRunOptions>(DEFAULT_OPTIONS)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  /** Bumped on every pick/reset so a slow read of an older file can't overwrite the newer preview. */
  const loadSeq = useRef(0)

  const reset = () => {
    loadSeq.current += 1
    setFile(null)
    setPreview(null)
    setVarNames([])
    setOptions(DEFAULT_OPTIONS)
    setError('')
    setBusy(false)
  }

  const loadFile = async (next: File) => {
    const seq = ++loadSeq.current
    setPreview(null)
    setVarNames([])
    setFile(next)
    const fileError = validateCsvFile(next)
    if (fileError) {
      setBusy(false)
      setError(fileError)
      return
    }
    setBusy(true)
    try {
      const text = await next.text()
      if (seq !== loadSeq.current) return
      const result = parseCsvPreview(text)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError('')
      setPreview(result.preview)
      setVarNames(result.preview.headers.map(toVariableName))
    } catch (err) {
      if (seq !== loadSeq.current) return
      setError(err instanceof Error ? `Could not read the file: ${err.message}` : 'Could not read the file.')
    } finally {
      if (seq === loadSeq.current) setBusy(false)
    }
  }

  const renameVar = (index: number, value: string) => {
    setVarNames((current) => current.map((name, i) => (i === index ? value : name)))
  }

  const varErrors = validateVariableNames(varNames)
  const canCreate = Boolean(file && preview) && Object.keys(varErrors).length === 0 && !busy

  /** Uploads the CSV into the project's data/ folder and returns the CSVDataSet node, or null on failure. */
  const create = async (confirmOverwrite: (message: string) => boolean = (m) => window.confirm(m)): Promise<TestPlanNode | null> => {
    if (!file || !preview || !canCreate) return null
    setBusy(true)
    setError('')
    try {
      const existing = findConflictingAsset(await projectAssetService.listAssets().catch(() => []), file.name)
      if (existing && !confirmOverwrite(overwritePrompt(existing))) return null
      const uploaded = await projectAssetService.uploadAsset(file, 'data')
      const properties = buildCsvDataSetProperties({
        relativePath: uploaded.relativePath,
        delimiter: preview.delimiter,
        variableNames: varNames,
        quoted: preview.quoted,
        ...options,
      })
      return createNode('CSVDataSet', `CSV Data - ${file.name}`, properties)
    } catch (err) {
      setError(err instanceof Error ? `Upload failed: ${err.message}` : 'Upload failed.')
      return null
    } finally {
      setBusy(false)
    }
  }

  return { file, preview, varNames, varErrors, options, setOptions, error, busy, canCreate, loadFile, renameVar, create, reset }
}
