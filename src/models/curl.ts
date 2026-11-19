import type { TableRow } from './jmeter'

export interface ParsedCurl {
  raw: string
  method: string
  url: string
  protocol: string
  server: string
  port: string
  path: string
  headers: TableRow[]
  cookies: TableRow[]
  parameters: TableRow[]
  body: string
  isRawBody: boolean
  suggestedName: string
}
