export interface ConversionOptions {
  groupByTransaction?: boolean
  createHeaderManager?: boolean
  createCookieManager?: boolean
  createDefaults?: boolean
  cleanRedundantHeaders?: boolean
  maskSensitive?: boolean
  parameterizeSecrets?: boolean
  customNaming?: 'method-path' | 'path-only' | 'index-method-path'
}

export type RedactionMode = 'mask' | 'parameterize' | 'none'
