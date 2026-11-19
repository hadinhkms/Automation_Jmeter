/**
 * Safe Base64 decoding supporting UTF-8 and Unicode characters.
 */
export function safeBase64Decode(base64Str: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64Str, 'base64').toString('utf-8')
    }
    const binary = atob(base64Str)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    try {
      return atob(base64Str)
    } catch {
      return base64Str
    }
  }
}

export function parseUrlParts(urlStr: string) {
  try {
    let toParse = urlStr
    if (!/^https?:\/\//i.test(toParse)) toParse = `https://${toParse}`
    const u = new URL(toParse)
    return {
      protocol: u.protocol.replace(':', '').toLowerCase(),
      server: u.hostname,
      port: u.port || '',
      path: (u.pathname + u.search) || '/',
      cleanPath: u.pathname || '/',
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
    }
  }
}
