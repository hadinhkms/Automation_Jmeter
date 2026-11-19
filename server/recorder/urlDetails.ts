import type { RecordedParam } from '../../src/models/recorder'

export function parseUrlDetails(urlStr: string) {
  try {
    let toParse = urlStr
    if (!/^https?:\/\//i.test(toParse)) toParse = `https://${toParse}`
    const u = new URL(toParse)
    const queryParams: RecordedParam[] = []
    u.searchParams.forEach((val, key) => {
      queryParams.push({ name: key, value: val, encode: true })
    })
    return {
      protocol: u.protocol.replace(':', '').toLowerCase(),
      server: u.hostname,
      port: u.port || '',
      path: (u.pathname + u.search) || '/',
      cleanPath: u.pathname || '/',
      queryParams,
    }
  } catch {
    const qIdx = urlStr.indexOf('?')
    const cleanPath = qIdx !== -1 ? urlStr.slice(0, qIdx) : urlStr
    return {
      protocol: 'https',
      server: '',
      port: '',
      path: urlStr || '/',
      cleanPath: cleanPath || '/',
      queryParams: [],
    }
  }
}

/** Builds the auto page-split transaction name; throws if the URL cannot be parsed. */
export function buildPageStepName(url: string, nextStepIndex: () => number): string {
  const u = new URL(url)
  const cleanPath = u.pathname.replace(/^\/|\/$/g, '').replace(/[/_.-]+/g, '_') || 'Home'
  return `${String(nextStepIndex()).padStart(2, '0')}_Page_${cleanPath}`
}
