import type { TestPlanNode } from '../../models/jmeter'
import { PLAIN_ARGUMENT_FIELDS } from './argumentWriters'
import type { ComponentWriter } from './types'
import { appendCollection, propertySink, rows, value } from './xmlPrimitives'
import type { XmlDocument } from './xmlPrimitives'

function writeGrpc(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  const p = propertySink(documentNode, element)
  p.str('GRPCSampler.host', value(node, 'server', ''))
  p.str('GRPCSampler.port', value(node, 'port', '50051'))
  p.str('GRPCSampler.fullMethod', value(node, 'fullMethod', ''))
  p.str('GRPCSampler.requestJson', value(node, 'requestJson', ''))
  p.str('GRPCSampler.deadline', value(node, 'deadline', '5000'))
  p.bool('GRPCSampler.tls', value(node, 'tls', 'false') === 'true')
  p.str('GRPCSampler.protoFolder', value(node, 'protoFolder', ''))
  p.str('GRPCSampler.libFolder', value(node, 'libFolder', ''))
  const grpcMetadataRows = rows(node, 'metadata')
  if (grpcMetadataRows.length > 0) {
    appendCollection(documentNode, element, 'GRPCSampler.metadata', 'Argument', grpcMetadataRows, PLAIN_ARGUMENT_FIELDS)
  }
}

function writeTcp(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  const p = propertySink(documentNode, element)
  p.str('TCPSampler.server', value(node, 'server', ''))
  p.str('TCPSampler.port', value(node, 'port', ''))
  p.str('TCPSampler.timeout', value(node, 'timeout', '10000'))
  p.str('TCPSampler.ctimeout', value(node, 'connectTimeout', '5000'))
  p.str('TCPSampler.request', value(node, 'requestData', ''))
  p.bool('TCPSampler.reUseConnection', value(node, 'reuseConnection', true))
  p.bool('TCPSampler.closeConnection', value(node, 'closeConnection', false))
  p.bool('TCPSampler.nodelay', value(node, 'noDelay', false))
  p.str('TCPSampler.EolByte', value(node, 'eolByte', ''))
  p.str('TCPSampler.soLinger', value(node, 'soLinger', ''))
  p.str('TCPSampler.classname', value(node, 'classname', 'TCPClientImpl'))
}

/** WebSocket, gRPC and TCP samplers. */
export const writeProtocolSampler: ComponentWriter = (documentNode, element, node, type) => {
  const p = propertySink(documentNode, element)
  switch (type) {
    case 'WebSocketOpenSampler':
      p.str('serverAddress', value(node, 'server', ''))
      p.str('serverPort', value(node, 'port', '443'))
      p.str('contextPath', value(node, 'path', '/ws'))
      p.str('connectionTimeout', value(node, 'connectTimeout', 20000))
      p.str('readTimeout', value(node, 'readTimeout', 6000))
      p.bool('TLS', value(node, 'protocol', 'wss') === 'wss')
      return true
    case 'WebSocketSingleWriteSampler':
      p.str('requestData', value(node, 'requestData', ''))
      p.str('dataType', value(node, 'dataType', 'Text'))
      p.bool('createNewConnection', value(node, 'createNewConnection', false))
      return true
    case 'WebSocketSingleReadSampler':
      p.str('readTimeout', value(node, 'readTimeout', 6000))
      p.str('dataType', value(node, 'dataType', 'Text'))
      p.bool('createNewConnection', value(node, 'createNewConnection', false))
      return true
    case 'WebSocketCloseSampler':
      p.str('statusCode', value(node, 'statusCode', 1000))
      p.str('closeReason', value(node, 'closeReason', 'Normal Closure'))
      return true
    case 'GRPCSampler':
      writeGrpc(documentNode, element, node)
      return true
    case 'TCPSampler':
      writeTcp(documentNode, element, node)
      return true
    default:
      return false
  }
}
