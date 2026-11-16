import type { TableRow } from '../../models/jmeter'
import { boolProp, collectionRows, numProp, prop } from './domReaders'
import type { ParsedProperties, PropertyParser } from './types'

const FILE_FIELDS = { path: 'File.path', parameterName: 'File.paramname', mimeType: 'File.mimetype' }

function graphQlBody(element: Element): { query: string; variables: string; operationName: string } {
  const argumentRows = collectionRows(element, 'Arguments.arguments', {
    name: 'Argument.name',
    value: 'Argument.value',
  })
  let query = ''
  let variables = ''
  let operationName = ''
  if (argumentRows.length > 0) {
    try {
      const parsed = JSON.parse(String(argumentRows[0].value || '{}'))
      query = parsed.query || ''
      variables = typeof parsed.variables === 'object'
        ? JSON.stringify(parsed.variables, null, 2)
        : String(parsed.variables || '')
      operationName = parsed.operationName || ''
    } catch {
      query = String(argumentRows[0].value || '')
    }
  }
  return { query, variables, operationName }
}

function httpFiles(element: Element): TableRow[] {
  return collectionRows(element, 'HTTPFileArgs.files', FILE_FIELDS).length > 0
    ? collectionRows(element, 'HTTPFileArgs.files', FILE_FIELDS)
    : collectionRows(element, 'HTTPsampler.Files', FILE_FIELDS)
}

function httpRequestProperties(element: Element, common: ParsedProperties): ParsedProperties {
  const argumentRows = collectionRows(element, 'Arguments.arguments', {
    name: 'Argument.name',
    value: 'Argument.value',
    encode: 'HTTPArgument.always_encode',
    includeEquals: 'HTTPArgument.use_equals',
  })
  const parameters = argumentRows.map((row) => ({
    ...row,
    encode: Boolean(
      row.encode === true ||
      row.encode === 'true' ||
      (typeof row.value === 'string' && (row.value.includes(' ') || row.value.includes('"')))
    ),
  }))
  const rawBody = boolProp(element, 'HTTPSampler.postBodyRaw')
  const body = rawBody && argumentRows.length > 0
    ? String(argumentRows[0].value ?? '')
    : ''
  return {
    ...common,
    protocol: prop(element, 'HTTPSampler.protocol'),
    server: prop(element, 'HTTPSampler.domain'),
    port: prop(element, 'HTTPSampler.port'),
    method: prop(element, 'HTTPSampler.method', 'GET'),
    path: prop(element, 'HTTPSampler.path', '/'),
    contentEncoding: prop(element, 'HTTPSampler.contentEncoding'),
    followRedirects: boolProp(element, 'HTTPSampler.follow_redirects', true),
    autoRedirects: boolProp(element, 'HTTPSampler.auto_redirects'),
    keepAlive: boolProp(element, 'HTTPSampler.use_keepalive', true),
    multipart: boolProp(element, 'HTTPSampler.DO_MULTIPART_POST'),
    browserCompatible: boolProp(element, 'HTTPSampler.BROWSER_COMPATIBLE_MULTIPART'),
    postBodyRaw: rawBody,
    body,
    parameters: rawBody ? [] : parameters,
    files: httpFiles(element),
  }
}

/** HTTP, GraphQL, WebSocket, debug and JSR223 samplers / scripts. */
export const parseSamplerProperties: PropertyParser = (element, type, common) => {
  switch (type) {
    case 'GraphQLSampler': {
      const { query, variables, operationName } = graphQlBody(element)
      return {
        ...common,
        protocol: prop(element, 'HTTPSampler.protocol', 'https'),
        server: prop(element, 'HTTPSampler.domain'),
        port: prop(element, 'HTTPSampler.port'),
        path: prop(element, 'HTTPSampler.path', '/graphql'),
        query,
        variables,
        operationName,
      }
    }
    case 'WebSocketOpenSampler':
      return {
        ...common,
        server: prop(element, 'serverAddress'),
        port: prop(element, 'serverPort', '443'),
        path: prop(element, 'contextPath', '/ws'),
        protocol: boolProp(element, 'TLS', true) ? 'wss' : 'ws',
        connectTimeout: numProp(element, 'connectionTimeout', 20000),
        readTimeout: numProp(element, 'readTimeout', 6000),
      }
    case 'WebSocketSingleWriteSampler':
      return {
        ...common,
        requestData: prop(element, 'requestData'),
        dataType: prop(element, 'dataType', 'Text'),
        createNewConnection: boolProp(element, 'createNewConnection', false),
      }
    case 'WebSocketSingleReadSampler':
      return {
        ...common,
        readTimeout: numProp(element, 'readTimeout', 6000),
        dataType: prop(element, 'dataType', 'Text'),
        createNewConnection: boolProp(element, 'createNewConnection', false),
      }
    case 'WebSocketCloseSampler':
      return {
        ...common,
        statusCode: numProp(element, 'statusCode', 1000),
        closeReason: prop(element, 'closeReason', 'Normal Closure'),
      }
    case 'HTTPRequest':
      return httpRequestProperties(element, common)
    case 'HTTPRequestDefaults':
      return {
        ...common,
        protocol: prop(element, 'HTTPSampler.protocol'),
        server: prop(element, 'HTTPSampler.domain'),
        port: prop(element, 'HTTPSampler.port'),
        path: prop(element, 'HTTPSampler.path'),
        contentEncoding: prop(element, 'HTTPSampler.contentEncoding'),
      }
    case 'DebugSampler':
      return {
        ...common,
        displayJMeterProperties: boolProp(element, 'displayJMeterProperties', false),
        displayJMeterVariables: boolProp(element, 'displayJMeterVariables', true),
        displaySamplerProperties: boolProp(element, 'displaySamplerProperties', false),
        displaySystemProperties: boolProp(element, 'displaySystemProperties', false),
      }
    case 'JSR223Sampler':
    case 'JSR223PreProcessor':
    case 'JSR223PostProcessor':
    case 'JSR223Assertion':
      return {
        ...common,
        language: prop(element, 'scriptLanguage', 'groovy'),
        parameters: prop(element, 'parameters'),
        scriptFile: prop(element, 'filename'),
        cache: boolProp(element, 'cacheKey', true),
        script: prop(element, 'script'),
      }
    default:
      return undefined
  }
}
