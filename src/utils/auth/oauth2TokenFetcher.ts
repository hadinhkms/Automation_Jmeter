/**
 * OAuth 2.0 token helper (Client Credentials / Resource Owner Password).
 * The token request goes through the dev-server proxy (/api/jmeter/proxy/send-single) to avoid CORS.
 */
import type { SingleRequestConfig, SingleResponseResult } from '../../services/proxyDebugService'
import { parseTokenResponse, type OAuth2Result } from './oauth2TokenResponse'

export type { OAuth2Result, OAuth2Token } from './oauth2TokenResponse'

export type OAuth2GrantType = 'client_credentials' | 'password'

export interface OAuth2Config {
  grantType: OAuth2GrantType
  tokenUrl: string
  clientId: string
  clientSecret: string
  username: string
  password: string
  scope: string
  /** 'basic' = HTTP Basic client auth header, 'body' = client_id/client_secret form fields. */
  clientAuth: 'basic' | 'body'
}

export const OAUTH2_DEFAULTS: OAuth2Config = {
  grantType: 'client_credentials',
  tokenUrl: '',
  clientId: '',
  clientSecret: '${OAUTH_CLIENT_SECRET}',
  username: '',
  password: '',
  scope: '',
  clientAuth: 'body',
}

export function validateOAuth2Config(config: OAuth2Config): Partial<Record<keyof OAuth2Config, string>> {
  const errors: Partial<Record<keyof OAuth2Config, string>> = {}
  if (!/^https?:\/\/\S+$/i.test(config.tokenUrl.trim()) && !/^\$\{[^}]+\}/.test(config.tokenUrl.trim())) {
    errors.tokenUrl = 'Token URL must start with http:// or https://'
  }
  if (!config.clientId.trim()) errors.clientId = 'Required'
  if (config.grantType === 'password') {
    if (!config.username.trim()) errors.username = 'Required for the Password grant'
    if (!config.password) errors.password = 'Required for the Password grant'
  }
  return errors
}

function base64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary)
}

/** Builds the form-encoded token request (RFC 6749 §4.3 / §4.4). `resolve` expands `${VAR}` references. */
export function buildTokenRequest(config: OAuth2Config, resolve: (text: string) => string = (t) => t): SingleRequestConfig {
  const clientId = resolve(config.clientId.trim())
  const clientSecret = resolve(config.clientSecret)
  const form = new URLSearchParams({ grant_type: config.grantType })
  if (config.grantType === 'password') {
    form.set('username', resolve(config.username.trim()))
    form.set('password', resolve(config.password))
  }
  if (config.scope.trim()) form.set('scope', resolve(config.scope.trim()))
  const headers = [
    { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
    { name: 'Accept', value: 'application/json' },
  ]
  if (config.clientAuth === 'basic') {
    const id = encodeURIComponent(clientId)
    const secret = encodeURIComponent(clientSecret)
    headers.push({ name: 'Authorization', value: `Basic ${base64(`${id}:${secret}`)}` })
  } else {
    form.set('client_id', clientId)
    if (clientSecret) form.set('client_secret', clientSecret)
  }
  return { method: 'POST', url: resolve(config.tokenUrl.trim()), headers, body: form.toString(), timeoutMs: 15000 }
}

export type ProxySend = (request: SingleRequestConfig) => Promise<SingleResponseResult>

export async function fetchOAuth2Token(config: OAuth2Config, send: ProxySend, resolve?: (text: string) => string): Promise<OAuth2Result> {
  const errors = validateOAuth2Config(config)
  const first = Object.entries(errors)[0]
  if (first) return { ok: false, error: `${first[0]}: ${first[1]}` }
  const expand = resolve ?? ((text: string) => text)
  const fields = [config.tokenUrl, config.clientId, config.clientSecret, config.scope]
  if (config.grantType === 'password') fields.push(config.username, config.password)
  const unresolved = fields.map(expand).join(' ').match(/\$\{[^}]+\}/)
  if (unresolved) return { ok: false, error: `${unresolved[0]} is not defined in the active environment. Add it there or type the value.` }
  const request = buildTokenRequest(config, expand)
  const response = await send(request)
  return parseTokenResponse(response.status, response.body, response.statusText)
}
