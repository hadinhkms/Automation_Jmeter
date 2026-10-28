import type { JtlSample } from '../../services/jmeterRunnerService'
import type { TestPlanNode } from '../../models/jmeter'
import { resolveVariables } from '../../utils/variableResolver'
import { HTTP_METHODS, getHttpUrl, isNonHttpSampler } from './sampleHttpUtils'
import { findSamplerHeadersInTestPlan, findSamplerRequestInTestPlan } from './testPlanSamplerLookup'
import { parseSampleRequest } from './sampleRequestParser'
import { isValidHeaderName, shellQuote, toPostmanVariables } from './curlFormatting'

export function generateCurlCommand(
  sample: JtlSample,
  testPlan?: TestPlanNode | null,
  knownVariables?: Record<string, string>
): string {
  let url = getHttpUrl(sample)
  if (!url || isNonHttpSampler(sample)) return ''
  if (knownVariables) {
    url = resolveVariables(url, knownVariables)
  }

  const planRequest = findSamplerRequestInTestPlan(testPlan, sample.label)
  let method = (sample.method || '').toUpperCase()
  if (!method || method === 'HTTP' || !HTTP_METHODS.includes(method as typeof HTTP_METHODS[number])) {
    method = planRequest?.method || ''
  }
  if (!HTTP_METHODS.includes(method as typeof HTTP_METHODS[number])) {
    const text = `${sample.label} ${url} ${sample.request || ''}`.toUpperCase()
    if (/\b(GET)\b/.test(text)) method = 'GET'
    else if (/\b(POST|LOGIN|REGISTER|UPLOAD|CREATE|ADD|SUBMIT)\b/.test(text)) method = 'POST'
    else if (/\b(PUT|UPDATE)\b/.test(text)) method = 'PUT'
    else if (/\b(DELETE|REMOVE)\b/.test(text)) method = 'DELETE'
    else if (/\b(PATCH)\b/.test(text)) method = 'PATCH'
    else method = 'GET'
  }

  const { headers, body: parsedBody } = parseSampleRequest(sample, knownVariables)
  let body = parsedBody

  // CSV JTL has no samplerData: fall back to the body configured on the sampler in the test plan
  if (!body && planRequest?.body) {
    body = planRequest.body
  }

  // Fallback: If headers is missing authorization or essential headers, inspect TestPlan HeaderManager
  if (testPlan && (!headers.some((h) => h.name.toLowerCase() === 'authorization') || headers.length <= 2)) {
    const planHeaders = findSamplerHeadersInTestPlan(testPlan, sample.label)
    for (const ph of planHeaders) {
      if (!headers.some((h) => h.name.toLowerCase() === ph.name.toLowerCase())) {
        let name = ph.name
        let val = ph.value
        if (knownVariables) {
          name = resolveVariables(name, knownVariables)
          val = resolveVariables(val, knownVariables)
        }
        headers.push({ name, value: val })
      }
    }
  }

  // Final sweep: ensure all headers have variables resolved
  if (knownVariables) {
    for (const h of headers) {
      h.name = resolveVariables(h.name, knownVariables)
      h.value = resolveVariables(h.value, knownVariables)
    }
  }
  // Postman rejects the whole request on one invalid name ("Invalid HTTP Token"), so drop anything that is not an RFC 7230 token
  const validHeaders = headers.filter((h) => isValidHeaderName(h.name))

  // Postman cURL syntax:
  const parts: string[] = []
  const quotedUrl = shellQuote(toPostmanVariables(url))
  if (method === 'GET') {
    parts.push(`curl --location ${quotedUrl}`)
  } else {
    parts.push(`curl --location --request ${method} ${quotedUrl}`)
  }

  // Headers (Postman format: --header '<key>: <value>')
  if (validHeaders.length > 0) {
    for (const h of validHeaders) {
      parts.push(`--header ${shellQuote(toPostmanVariables(`${h.name}: ${h.value}`))}`)
    }
  } else {
    parts.push(`--header 'accept: application/json'`)
    if (body || method === 'POST' || method === 'PUT' || method === 'PATCH') {
      parts.push(`--header 'content-type: application/json'`)
    }
  }

  // Body data (Postman format: --data-raw '{ ... }')
  if (body) {
    let formattedBody = knownVariables ? resolveVariables(body, knownVariables) : body
    try {
      if (formattedBody.startsWith('{') || formattedBody.startsWith('[')) {
        const parsed = JSON.parse(formattedBody)
        formattedBody = JSON.stringify(parsed, null, 2)
      }
    } catch {
      // keep original
    }
    parts.push(`--data-raw ${shellQuote(toPostmanVariables(formattedBody))}`)
  }

  return parts.join(' \\\n')
}
