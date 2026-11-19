import { useMemo } from 'react'
import type { JtlSample } from '../../../services/jmeterRunnerService'
import type { TestPlanNode } from '../../../models/jmeter'
import { useEnvironmentStore } from '../../../store/environmentStore'
import { collectKnownVariables, resolveVariables } from '../../../utils/variableResolver'
import { getHttpUrl, isHttpRequestSample } from '../sampleHttpUtils'
import { generateCurlCommand } from '../curlCommandBuilder'
import { extractDebugVariables, formatRequestBody, parseUrlInfo } from './sampleParsers'
import { buildFormattedResponseHeaders, buildRequestHeaders, parseResponseHeadersList } from './headerParsers'
import { buildResponseBody, buildSamplerResultText, generateHttpResponsePreview } from './sampleTextBuilders'

/** Derives every text/table shown in the detail pane for the selected sample. */
export function useSampleDetails(
  samples: JtlSample[],
  filteredSamples: JtlSample[],
  selectedId: string,
  testPlan: TestPlanNode
) {
  const activeEnvVariables = useEnvironmentStore((s) => s.activeVariables)

  const debugVariables = useMemo(() => extractDebugVariables(samples), [samples])

  const allKnownVariables = useMemo(() => {
    return collectKnownVariables(testPlan, activeEnvVariables, debugVariables)
  }, [testPlan, activeEnvVariables, debugVariables])

  const selectedSample = useMemo(() => {
    return samples.find((s) => s.id === selectedId) || filteredSamples[0] || samples[0]
  }, [samples, filteredSamples, selectedId])

  const selectedHttpUrl = useMemo(() => {
    if (!selectedSample) return ''
    const raw = getHttpUrl(selectedSample)
    return allKnownVariables ? resolveVariables(raw, allKnownVariables) : raw
  }, [selectedSample, allKnownVariables])

  const isSelectedHttpRequest = useMemo(() => {
    return selectedSample ? isHttpRequestSample(selectedSample) : false
  }, [selectedSample])

  const urlInfo = useMemo(() => parseUrlInfo(selectedHttpUrl), [selectedHttpUrl])

  const samplerResultText = useMemo(() => {
    return selectedSample ? buildSamplerResultText(selectedSample) : ''
  }, [selectedSample])

  const responseBody = useMemo(() => {
    return selectedSample ? buildResponseBody(selectedSample) : ''
  }, [selectedSample])

  // Pretty view: indent valid JSON (parse the raw body so escaped quotes stay valid); otherwise fall back to the raw body
  const prettyResponseBody = useMemo(() => {
    const raw = (selectedSample?.response || '').trim()
    if (!raw.startsWith('{') && !raw.startsWith('[')) return responseBody
    try {
      return JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      return responseBody
    }
  }, [selectedSample, responseBody])

  const requestBody = useMemo(() => {
    return selectedSample ? formatRequestBody(selectedSample, allKnownVariables) : ''
  }, [selectedSample, allKnownVariables])

  const requestHeaders = useMemo(() => {
    return selectedSample ? buildRequestHeaders(selectedSample, urlInfo, testPlan, allKnownVariables) : ''
  }, [selectedSample, urlInfo, testPlan, allKnownVariables])

  const formattedResponseHeaders = useMemo(() => {
    return selectedSample ? buildFormattedResponseHeaders(selectedSample) : ''
  }, [selectedSample])

  const responseHeadersList = useMemo(() => {
    if (!selectedSample) return []
    return parseResponseHeadersList(formattedResponseHeaders)
  }, [selectedSample, formattedResponseHeaders])

  const cookiesList = useMemo(() => {
    return responseHeadersList.filter((h) => h.name.toLowerCase() === 'set-cookie')
  }, [responseHeadersList])

  const curlCommand = useMemo(() => {
    return selectedSample ? generateCurlCommand(selectedSample, testPlan, allKnownVariables) : ''
  }, [selectedSample, testPlan, allKnownVariables])

  const curlResponsePreview = useMemo(() => {
    return selectedSample ? generateHttpResponsePreview(selectedSample) : ''
  }, [selectedSample])

  return {
    selectedSample,
    selectedHttpUrl,
    isSelectedHttpRequest,
    urlInfo,
    samplerResultText,
    responseBody,
    prettyResponseBody,
    requestBody,
    requestHeaders,
    formattedResponseHeaders,
    responseHeadersList,
    cookiesList,
    curlCommand,
    curlResponsePreview,
  }
}

export type SampleDetails = ReturnType<typeof useSampleDetails>
