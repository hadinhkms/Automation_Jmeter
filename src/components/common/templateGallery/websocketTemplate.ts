import { Radio } from 'lucide-react'
import { createNode } from '../../../mock/sampleTestPlan'
import type { TemplateItem } from '../../../models/templateGallery'

export const websocketTemplate: TemplateItem = {
  id: 'websocket_chat_stream',
  title: 'WebSocket Realtime Messaging & Stream Load Test',
  category: 'WebSocket',
  icon: Radio,
  badge: 'Real-time',
  description: 'Open persistent WebSocket TLS connection, stream heartbeat pings and payload frames, read responses, and gracefully close.',
  tags: ['WebSocket WSS', 'Persistent Conn', 'Low Latency', 'Real-time'],
  buildPlan: () => {
    const tg = createNode('ThreadGroup', 'WebSocket Clients Group', {
      threads: 60,
      rampUp: 10,
      loops: 10,
    }, [
      createNode('WebSocketOpenSampler', 'WebSocket 01 - Connect WSS', {
        server: 'realtime.example.com',
        port: '443',
        path: '/socket/v1',
        protocol: 'wss',
        connectTimeout: 15000,
      }),
      createNode('WebSocketSingleWriteSampler', 'WebSocket 02 - Send Message', {
        requestData: '{"action":"joinRoom","roomId":"room_live_99"}',
        dataType: 'Text',
      }),
      createNode('WebSocketSingleReadSampler', 'WebSocket 03 - Wait Response', {
        readTimeout: 5000,
        dataType: 'Text',
      }),
      createNode('WebSocketCloseSampler', 'WebSocket 04 - Close Connection', {
        statusCode: 1000,
        closeReason: 'Test Finished',
      }),
      createNode('ViewResultsTree'),
      createNode('SummaryReport'),
    ])

    return createNode('TestPlan', 'WebSocket Realtime Messaging Test', {}, [tg])
  },
}
