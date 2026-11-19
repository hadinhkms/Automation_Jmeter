import type { RecordedRequest, RecordedParam } from '../../models/recorder'
import type { TableRow } from '../../models/jmeter'
import { redactParams } from '../redaction/redactFields'
import { redactBodyContent } from '../redaction/redactBody'
import type { RedactionMode } from '../../models/recording'
import { collectFormParams } from './params'

/**
 * Request Body / Form Params / Multipart Processing for a recorded request.
 */
export function buildSamplerBody(
  req: RecordedRequest,
  redactionMode: RedactionMode,
  processedQueryParams: RecordedParam[],
  globalVariablesCollector?: Record<string, string>,
) {
  const contentType = (
    req.requestHeaders.find((h) => h.name.toLowerCase() === 'content-type')?.value ||
    req.mimeType ||
    ''
  ).toLowerCase()

  const isFormUrlEncoded =
    contentType.includes('application/x-www-form-urlencoded') ||
    (req.postParams && req.postParams.length > 0 && !contentType.includes('json') && !contentType.includes('multipart'))
  const isMultipart = contentType.includes('multipart/form-data') || (req.files && req.files.length > 0)

  let postBodyRaw = false
  let bodyContent = ''
  const finalParameters: TableRow[] = []
  const filesList: TableRow[] = []

  if (isFormUrlEncoded) {
    // URL-encoded form parameters
    postBodyRaw = false
    bodyContent = ''

    const formParams = collectFormParams(req)

    const { params: processedFormParams, extractedVariables: formVars } = redactParams(
      formParams,
      redactionMode,
    )
    if (globalVariablesCollector) {
      Object.assign(globalVariablesCollector, formVars)
    }

    for (const p of processedFormParams) {
      finalParameters.push({
        name: p.name,
        value: p.value,
        encode: p.encode !== false,
      })
    }
  } else if (isMultipart) {
    // Multipart form data
    postBodyRaw = false
    bodyContent = ''

    if (req.postParams) {
      const { params: processedParams, extractedVariables: mpVars } = redactParams(
        req.postParams,
        redactionMode,
      )
      if (globalVariablesCollector) Object.assign(globalVariablesCollector, mpVars)
      for (const p of processedParams) {
        finalParameters.push({ name: p.name, value: p.value, encode: false })
      }
    }

    if (req.files) {
      for (const f of req.files) {
        filesList.push({
          path: f.path,
          parameterName: f.parameterName,
          mimeType: f.mimeType,
        })
      }
    }
  } else if (req.postData) {
    // JSON / XML / GraphQL / PlainText Raw Body
    postBodyRaw = true
    const { body: redactedBody, extractedVariables: bodyVars } = redactBodyContent(
      req.postData,
      redactionMode,
    )
    bodyContent = redactedBody
    if (globalVariablesCollector) {
      Object.assign(globalVariablesCollector, bodyVars)
    }
  } else {
    // GET / Query-only: use query params
    postBodyRaw = false
    for (const p of processedQueryParams) {
      finalParameters.push({
        name: p.name,
        value: p.value,
        encode: p.encode !== false,
      })
    }
  }

  return { isMultipart, postBodyRaw, bodyContent, finalParameters, filesList }
}
