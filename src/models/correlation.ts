export interface CorrelationTarget {
  targetRequestId: string
  targetRequestName: string
  location: 'header' | 'param' | 'body' | 'url'
  field?: string
  originalValue: string
  replacementExpression: string
}

export interface CorrelationCandidate {
  id: string
  variableName: string
  sourceRequestId: string
  sourceRequestName: string
  extractorType: 'JSONExtractor' | 'RegexExtractor'
  jsonPath?: string
  regex?: string
  sampleValue: string
  confidence: 'HIGH' | 'MEDIUM'
  targets: CorrelationTarget[]
  enabled: boolean
}

export interface DiscoveredValue {
  key: string
  value: string
  jsonPath?: string
  regex?: string
  extractorType: 'JSONExtractor' | 'RegexExtractor'
  isHighConfidence: boolean
}
