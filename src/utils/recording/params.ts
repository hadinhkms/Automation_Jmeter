import type { RecordedRequest, RecordedParam } from '../../models/recorder'

/**
 * Extracts query parameters from a URL and returns clean pathname.
 */
export function extractQueryParamsAndPath(urlStr: string): {
  cleanPath: string
  queryParams: RecordedParam[]
} {
  try {
    let toParse = urlStr
    if (!/^https?:\/\//i.test(toParse)) toParse = `https://${toParse}`
    const u = new URL(toParse)
    const params: RecordedParam[] = []
    u.searchParams.forEach((val, key) => {
      params.push({ name: key, value: val, encode: true })
    })
    const cleanPath = u.pathname || '/'
    return { cleanPath, queryParams: params }
  } catch {
    const qIdx = urlStr.indexOf('?')
    if (qIdx !== -1) {
      const cleanPath = urlStr.slice(0, qIdx) || '/'
      const qStr = urlStr.slice(qIdx + 1)
      const params: RecordedParam[] = []
      const pairs = qStr.split('&')
      for (const pair of pairs) {
        const [k, v] = pair.split('=')
        if (k) {
          params.push({
            name: decodeURIComponent(k),
            value: v ? decodeURIComponent(v) : '',
            encode: true,
          })
        }
      }
      return { cleanPath, queryParams: params }
    }
    return { cleanPath: urlStr || '/', queryParams: [] }
  }
}

/**
 * Collects URL-encoded form params from postParams, or by splitting raw postData.
 */
export function collectFormParams(req: RecordedRequest): RecordedParam[] {
  const formParams: RecordedParam[] = req.postParams && req.postParams.length > 0 ? [...req.postParams] : []
  if (formParams.length === 0 && req.postData) {
    const pairs = req.postData.split('&')
    for (const p of pairs) {
      const [k, v] = p.split('=')
      if (k) {
        formParams.push({
          name: decodeURIComponent(k),
          value: v ? decodeURIComponent(v) : '',
          encode: true,
        })
      }
    }
  }
  return formParams
}
