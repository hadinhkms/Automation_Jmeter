export interface PostmanHeader {
  key: string
  value: string
  disabled?: boolean
  description?: string
}

export interface PostmanUrl {
  raw?: string
  protocol?: string
  host?: string[] | string
  path?: string[] | string
  port?: string
  query?: Array<{ key: string; value: string; disabled?: boolean }>
}

export interface PostmanBody {
  mode?: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql'
  raw?: string
  urlencoded?: Array<{ key: string; value: string; disabled?: boolean }>
  formdata?: Array<{ key: string; value: string; type?: string; disabled?: boolean }>
}

export interface PostmanAuth {
  type: string
  bearer?: Array<{ key: string; value: string; type: string }>
  basic?: Array<{ key: string; value: string; type: string }>
}

export interface PostmanRequest {
  method: string
  header?: PostmanHeader[]
  url?: string | PostmanUrl
  body?: PostmanBody
  auth?: PostmanAuth
  description?: string
}

export interface PostmanEvent {
  listen: string
  script?: {
    type?: string
    exec?: string[] | string
  }
}

export interface PostmanItem {
  id?: string
  name: string
  description?: string
  item?: PostmanItem[]
  request?: PostmanRequest
  event?: PostmanEvent[]
}

export interface PostmanCollection {
  info: {
    _postman_id?: string
    name: string
    schema: string
    description?: string
  }
  item: PostmanItem[]
  variable?: Array<{ key: string; value: string; type?: string }>
}

export interface FlatPostmanItem {
  id: string
  name: string
  path: string
  isFolder: boolean
  method?: string
  url?: string
  rawItem: PostmanItem
}
