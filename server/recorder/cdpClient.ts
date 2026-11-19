import WebSocket from 'ws'
import { closeSocketQuietly, dispatchCdpMessage, waitForSocketOpen, type CdpCallback } from './cdpTransport'

/** One CDP WebSocket connection: request/response correlation plus event dispatch. */
export class CdpClient {
  private nextMsgId = 1
  private callbacks = new Map<number, CdpCallback>()

  private constructor(private readonly ws: WebSocket) {}

  /** Opens the socket and wires message/close handlers. */
  static async connect(
    wsUrl: string,
    onEvent: (method: string, params: Record<string, unknown> | undefined) => void,
    onClose: () => void,
  ): Promise<CdpClient> {
    const ws = new WebSocket(wsUrl)
    const client = new CdpClient(ws)
    try {
      await waitForSocketOpen(ws)
    } catch (err) {
      closeSocketQuietly(ws)
      throw err
    }
    ws.on('message', (data: WebSocket.RawData) => dispatchCdpMessage(data, client.callbacks, onEvent))
    ws.on('close', onClose)
    return client
  }

  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('CDP WebSocket is not connected.'))
      }
      const id = this.nextMsgId++
      this.callbacks.set(id, (res) => {
        if (res.error) reject(new Error(res.error.message || 'CDP Error'))
        // SAFETY: CDP result shape is defined by the protocol method the caller requested
        else resolve(res.result as T)
      })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  close(): void {
    closeSocketQuietly(this.ws)
  }
}
