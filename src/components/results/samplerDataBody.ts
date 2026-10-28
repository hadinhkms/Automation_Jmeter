const DATA_MARKER = /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)\s+data:[ \t]*$/im
const REQUEST_LINE = /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)\s+https?:\/\//
const TRAILER_MARKER = /(?:^|\n)\s*(?:\[no cookies\]|Cookie Data:)[\s\S]*$/

/**
 * JMeter HTTP samplerData looks like:
 *   POST https://host/path\n\nPOST data:\n{body}\n\n[no cookies]
 * Return only the {body} part; non-HTTP sampler data (no "data:" marker) is returned unchanged.
 */
export function extractBodyFromSamplerData(samplerData: string): string {
  if (!samplerData) return ''
  const marker = DATA_MARKER.exec(samplerData)
  if (!marker) {
    // "GET https://host/path\nHeader: value" is a request line plus headers (no body), not body data
    return REQUEST_LINE.test(samplerData.trimStart()) ? '' : samplerData.trim()
  }

  const afterMarker = samplerData.slice(marker.index + marker[0].length)
  return afterMarker.replace(TRAILER_MARKER, '').trim()
}
