/** Parses OAuth 2.0 token endpoint responses (RFC 6749 §5.1 success / §5.2 error). */

export interface OAuth2Token {
  accessToken: string
  tokenType: string
  expiresIn: number | null
}

export type OAuth2Result = { ok: true; token: OAuth2Token } | { ok: false; error: string }

/** The dev-server proxy answers 502 "Bad Gateway" / 504 "Gateway Timeout…" with the fetch error text when the URL is unreachable. */
export function isProxyNetworkFailure(status: number, statusText: string, isJson: boolean): boolean {
  return (status === 502 && /^Bad Gateway/i.test(statusText)) || (status === 504 && /^Gateway Timeout/i.test(statusText)) ? !isJson : false
}

/** RFC 6749 token_type is case-insensitive; "bearer" becomes `Bearer`, other schemes (e.g. `MAC`, `DPoP`) are kept. */
export function authScheme(tokenType: string | undefined): string {
  const type = (tokenType ?? '').trim()
  return !type || type.toLowerCase() === 'bearer' ? 'Bearer' : type
}

/** Reads access_token from a token response, or returns the server's OAuth error in plain words. */
export function parseTokenResponse(status: number, body: string, statusText = ''): OAuth2Result {
  let json: Record<string, unknown> | null = null
  // SAFETY: every field is typeof-checked before use, so non-object JSON ends up rejected
  try { json = JSON.parse(body) as Record<string, unknown> } catch { json = null }
  if (status === 0 || isProxyNetworkFailure(status, statusText, json !== null)) {
    return { ok: false, error: `Could not reach the token endpoint: ${body || statusText || 'network error'}` }
  }
  if (json && typeof json.error === 'string') {
    const detail = typeof json.error_description === 'string' ? ` – ${json.error_description}` : ''
    return { ok: false, error: `Token endpoint returned ${status}: ${json.error}${detail}` }
  }
  if (status < 200 || status >= 300) return { ok: false, error: `Token endpoint returned HTTP ${status}.` }
  if (!json || typeof json.access_token !== 'string' || !json.access_token) {
    return { ok: false, error: 'Response has no access_token field (is this an OAuth 2.0 token URL?).' }
  }
  const expires = Number(json.expires_in)
  return {
    ok: true,
    token: {
      accessToken: json.access_token,
      tokenType: authScheme(typeof json.token_type === 'string' ? json.token_type : undefined),
      expiresIn: Number.isFinite(expires) && expires > 0 ? expires : null,
    },
  }
}
