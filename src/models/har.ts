export interface HarEntry {
  startedDateTime?: string
  time?: number
  pageref?: string
  request?: {
    method?: string
    url?: string
    httpVersion?: string
    headers?: Array<{ name: string; value: string }>
    queryString?: Array<{ name: string; value: string }>
    cookies?: Array<{
      name: string
      value: string
      path?: string
      domain?: string
      expires?: string
      httpOnly?: boolean
      secure?: boolean
    }>
    headersSize?: number
    bodySize?: number
    postData?: {
      mimeType?: string
      text?: string
      params?: Array<{
        name: string
        value?: string
        fileName?: string
        contentType?: string
        comment?: string
      }>
    }
  }
  response?: {
    status?: number
    statusText?: string
    httpVersion?: string
    headers?: Array<{ name: string; value: string }>
    cookies?: Array<{
      name: string
      value: string
      path?: string
      domain?: string
      expires?: string
      httpOnly?: boolean
      secure?: boolean
    }>
    content?: {
      size?: number
      mimeType?: string
      text?: string
      encoding?: string
    }
    redirectURL?: string
    headersSize?: number
    bodySize?: number
  }
  _resourceType?: string
}

export interface HarRoot {
  log?: {
    version?: string
    creator?: { name?: string; version?: string }
    pages?: Array<{ id?: string; title?: string; startedDateTime?: string }>
    entries?: HarEntry[]
  }
}
