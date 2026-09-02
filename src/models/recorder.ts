export interface RecordedHeader {
  name: string
  value: string
}

export interface RecordedCookie {
  name: string
  value: string
  domain?: string
  path?: string
  secure?: boolean
  expires?: string
}

export interface RecordedParam {
  name: string
  value: string
  encode?: boolean
}

export interface RecordedFile {
  path: string
  parameterName: string
  mimeType: string
}

export interface RecordedRequest {
  id: string
  requestId: string
  transaction: string
  timestamp: number
  url: string
  method: string
  protocol: string
  server: string
  port: string
  path: string
  resourceType: string
  requestHeaders: RecordedHeader[]
  cookies?: RecordedCookie[]
  queryParams?: RecordedParam[]
  postParams?: RecordedParam[]
  files?: RecordedFile[]
  postData?: string
  responseStatus?: number
  responseStatusText?: string
  responseHeaders?: RecordedHeader[]
  responseBody?: string
  mimeType?: string
  durationMs?: number
  startTime: number
  endTime?: number
  sizeBytes?: number
  error?: string
  hasSensitiveData?: boolean
  sensitiveFields?: string[]
}

export interface BrowserDetection {
  chrome?: string
  edge?: string
  custom?: string
  available: Array<{ type: 'chrome' | 'edge' | 'custom'; name: string; path: string }>
}
