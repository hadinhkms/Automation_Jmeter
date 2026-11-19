import type { RecordedRequest } from '../../models/recorder'
import type { ConversionOptions } from '../../models/recording'

/**
 * Formats a clean name for an HTTP sampler.
 */
export function formatSamplerName(
  req: RecordedRequest,
  index: number,
  naming: ConversionOptions['customNaming'] = 'index-method-path',
): string {
  const cleanPath = (req.path || '').split('?')[0] || '/'
  const truncatedPath = cleanPath.length > 40 ? cleanPath.slice(0, 37) + '...' : cleanPath

  if (naming === 'path-only') {
    return truncatedPath
  }
  if (naming === 'method-path') {
    return `${req.method} ${truncatedPath}`
  }
  return `${index + 1}.0 ${req.method} ${truncatedPath}`
}
