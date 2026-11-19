import type { TableRow } from '../../models/jmeter'

/** Data flags (take one argument, imply POST). */
export const CURL_DATA_FLAGS = new Set([
  '-d',
  '--data',
  '--data-raw',
  '--data-binary',
  '--data-ascii',
  '--data-urlencode',
])

/** Flags that don't take arguments. */
export const CURL_NO_ARG_FLAGS = new Set([
  '--location',
  '-L',
  '--compressed',
  '-k',
  '--insecure',
  '-s',
  '--silent',
  '-v',
  '--verbose',
])

export function pushHeaderArg(headerStr: string, headers: TableRow[]): void {
  const colonIdx = headerStr.indexOf(':')
  if (colonIdx !== -1) {
    const name = headerStr.slice(0, colonIdx).trim()
    const value = headerStr.slice(colonIdx + 1).trim()
    headers.push({ name, value })
  }
}

export function pushBasicAuth(userPass: string, headers: TableRow[]): void {
  try {
    const encoded = btoa(userPass)
    headers.push({ name: 'Authorization', value: `Basic ${encoded}` })
  } catch {
    // ignore btoa error
  }
}

export function pushCookies(cookieStr: string, cookies: TableRow[]): void {
  const pairs = cookieStr.split(';')
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx !== -1) {
      cookies.push({
        name: pair.slice(0, eqIdx).trim(),
        value: pair.slice(eqIdx + 1).trim(),
        domain: '',
        path: '',
        secure: false,
        expires: '',
      })
    }
  }
}
