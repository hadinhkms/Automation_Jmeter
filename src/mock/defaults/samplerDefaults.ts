import type { JMeterComponentType } from '../../models/jmeter'

/** Default properties for samplers and backend listener. Returns undefined for types handled elsewhere. */
export function samplerDefaults(
  type: JMeterComponentType,
  common: { comments: string },
): Record<string, unknown> | undefined {
  switch (type) {
    case 'HTTPRequest':
      return {
        ...common,
        protocol: 'https',
        server: '',
        port: '',
        method: 'GET',
        path: '/',
        contentEncoding: '',
        followRedirects: true,
        autoRedirects: false,
        keepAlive: true,
        multipart: false,
        browserCompatible: false,
        parameters: [],
        body: '',
        files: [],
      }
    case 'GraphQLSampler':
      return {
        ...common,
        protocol: 'https',
        server: '',
        port: '',
        path: '/graphql',
        operationName: '',
        query: 'query GetItems {\n  items {\n    id\n    name\n  }\n}',
        variables: '{\n  "limit": 10\n}',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
      }
    case 'WebSocketOpenSampler':
      return {
        ...common,
        server: '',
        port: '443',
        path: '/ws',
        protocol: 'wss',
        connectTimeout: 20000,
        readTimeout: 6000,
      }
    case 'WebSocketSingleWriteSampler':
      return {
        ...common,
        requestData: '{"action":"ping","timestamp":"${__time()}"}',
        dataType: 'Text',
        createNewConnection: false,
      }
    case 'WebSocketSingleReadSampler':
      return {
        ...common,
        readTimeout: 6000,
        dataType: 'Text',
        createNewConnection: false,
      }
    case 'WebSocketCloseSampler':
      return {
        ...common,
        statusCode: 1000,
        closeReason: 'Normal Closure',
      }
    case 'GRPCSampler':
      return {
        ...common,
        serverName: 'localhost',
        port: '50051',
        serviceName: '',
        methodName: '',
        protoFolder: '',
        requestJson: '{}',
        deadlineMs: 5000,
        useTls: false,
      }
    case 'TCPSampler':
      return {
        ...common,
        server: 'localhost',
        port: '8080',
        classname: 'TCPClientImpl',
        requestData: '',
        timeout: 5000,
        closeConnection: false,
        reUseConnection: true,
      }
    case 'BackendListener':
      return {
        ...common,
        classname: 'org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender',
        influxdbUrl: 'http://localhost:8086/api/v2/write?org=org&bucket=jmeter',
        application: 'jmeter-load-test',
        measurement: 'jmeter',
        summaryOnly: false,
        samplersRegex: '.*',
        percentiles: '90;95;99',
        testTitle: 'JMeter Studio Performance Run',
      }
    default:
      return undefined
  }
}
