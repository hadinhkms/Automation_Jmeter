import type { TestPlanNode } from '../../models/jmeter'
import { appendArguments, appendFiles } from './argumentWriters'
import type { ComponentWriter } from './types'
import { propertySink, rows, value } from './xmlPrimitives'
import type { XmlDocument } from './xmlPrimitives'

function graphQlPayload(node: TestPlanNode): string {
  const query = String(value(node, 'query', ''))
  const variables = String(value(node, 'variables', ''))
  const opName = String(value(node, 'operationName', ''))
  let bodyPayload = ''
  try {
    const parsedVars = variables ? JSON.parse(variables) : {}
    bodyPayload = JSON.stringify({ query, variables: parsedVars, operationName: opName || undefined }, null, 2)
  } catch {
    bodyPayload = JSON.stringify({ query, operationName: opName || undefined }, null, 2)
  }
  return bodyPayload
}

function writeGraphQl(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  const p = propertySink(documentNode, element)
  const parameters = [{ name: '', value: graphQlPayload(node), metadata: '=', encode: false, includeEquals: true }]
  appendArguments(documentNode, element, parameters)
  p.str('HTTPSampler.domain', value(node, 'server'))
  p.str('HTTPSampler.port', value(node, 'port'))
  p.str('HTTPSampler.protocol', value(node, 'protocol', 'https'))
  p.str('HTTPSampler.path', value(node, 'path', '/graphql'))
  p.str('HTTPSampler.method', 'POST')
  p.bool('HTTPSampler.follow_redirects', true)
  p.bool('HTTPSampler.use_keepalive', true)
  p.bool('HTTPSampler.postBodyRaw', true)
}

function mustEncodeValue(encode: unknown, val: string): boolean {
  return encode === true ||
    encode === undefined ||
    val.includes(' ') ||
    val.includes('"') ||
    val.includes('(') ||
    val.includes(')') ||
    val.includes('[') ||
    val.includes(']')
}

function writeHttpRequest(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  const p = propertySink(documentNode, element)
  const body = String(value(node, 'body'))
  const rawPath = String(value(node, 'path') || '')
  const paramRows = rows(node, 'parameters')

  // Encode spaces to %20 to avoid java.net.URISyntaxException
  const cleanPath = rawPath.replace(/ /g, '%20')

  const isRawBody = Boolean(value(node, 'postBodyRaw', Boolean(body)))
  const parameters = isRawBody && body
    ? [{ name: '', value: body, metadata: '=', encode: false, includeEquals: true }]
    : paramRows.map((row) => ({
        ...row,
        metadata: '=',
        includeEquals: true,
        encode: mustEncodeValue(row.encode, String(row.value ?? '')),
      }))

  appendArguments(documentNode, element, parameters)
  p.str('HTTPSampler.domain', value(node, 'server'))
  p.str('HTTPSampler.port', value(node, 'port'))
  p.str('HTTPSampler.protocol', value(node, 'protocol'))
  p.str('HTTPSampler.contentEncoding', value(node, 'contentEncoding'))
  p.str('HTTPSampler.path', cleanPath)
  p.str('HTTPSampler.method', value(node, 'method', 'GET'))
  p.bool('HTTPSampler.follow_redirects', value(node, 'followRedirects', true))
  p.bool('HTTPSampler.auto_redirects', value(node, 'autoRedirects', false))
  p.bool('HTTPSampler.use_keepalive', value(node, 'keepAlive', true))
  p.bool('HTTPSampler.DO_MULTIPART_POST', value(node, 'multipart', false))
  p.bool('HTTPSampler.BROWSER_COMPATIBLE_MULTIPART', value(node, 'browserCompatible', false))
  p.bool('HTTPSampler.postBodyRaw', isRawBody)
  appendFiles(documentNode, element, rows(node, 'files'))
}

/** HTTP request, HTTP defaults and GraphQL (HTTP based) samplers. */
export const writeHttpComponent: ComponentWriter = (documentNode, element, node, type) => {
  switch (type) {
    case 'GraphQLSampler':
      writeGraphQl(documentNode, element, node)
      return true
    case 'HTTPRequestDefaults': {
      const p = propertySink(documentNode, element)
      p.str('HTTPSampler.domain', value(node, 'server'))
      p.str('HTTPSampler.port', value(node, 'port'))
      p.str('HTTPSampler.protocol', value(node, 'protocol'))
      p.str('HTTPSampler.contentEncoding', value(node, 'contentEncoding'))
      p.str('HTTPSampler.path', value(node, 'path'))
      return true
    }
    case 'HTTPRequest':
      writeHttpRequest(documentNode, element, node)
      return true
    default:
      return false
  }
}
