/**
 * Reference AWS Signature V4 signer (Web Crypto, works in browser and Node 18+).
 * The Groovy PreProcessor emitted by awsSigV4Generator mirrors these exact steps, so this is
 * what the wizard previews and what the tests check against AWS's published test vector.
 */

export interface SigV4Input {
  method: string
  url: string
  /** Extra headers to sign (name -> value). host and x-amz-date are always signed. */
  headers?: Record<string, string>
  body?: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  region: string
  service: string
  /** `yyyyMMddTHHmmssZ`; defaults to now (UTC). */
  amzDate?: string
}

export interface SigV4Result {
  authorization: string
  signature: string
  signedHeaders: string
  canonicalRequest: string
  stringToSign: string
  amzDate: string
  payloadHash: string
}

import { canonicalPath, canonicalQuery, toAmzDate } from './awsSigV4Canonical'

const encoder = new TextEncoder()
const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('')

async function sha256Hex(data: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(data)))
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
}

/** kSigning = HMAC(HMAC(HMAC(HMAC("AWS4"+secret, date), region), service), "aws4_request") */
export async function deriveSigningKey(secret: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(encoder.encode(`AWS4${secret}`), dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, service)
  return hmac(kService, 'aws4_request')
}

export async function deriveSigningKeyHex(secret: string, dateStamp: string, region: string, service: string): Promise<string> {
  return toHex(await deriveSigningKey(secret, dateStamp, region, service))
}

export async function signAwsV4(input: SigV4Input): Promise<SigV4Result> {
  const url = new URL(input.url)
  const amzDate = input.amzDate ?? toAmzDate(new Date())
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = await sha256Hex(input.body ?? '')

  const headers = new Map<string, string>()
  for (const [name, value] of Object.entries(input.headers ?? {})) headers.set(name.toLowerCase().trim(), value.trim().replace(/\s+/g, ' '))
  if (!headers.has('host')) headers.set('host', url.host)
  headers.set('x-amz-date', amzDate)
  if (input.sessionToken) headers.set('x-amz-security-token', input.sessionToken)

  const names = [...headers.keys()].sort()
  const signedHeaders = names.join(';')
  const canonicalHeaders = names.map((name) => `${name}:${headers.get(name)}\n`).join('')
  const canonicalRequest = [
    input.method.toUpperCase(),
    canonicalPath(url.pathname, input.service),
    canonicalQuery(url.search),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const scope = `${dateStamp}/${input.region}/${input.service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256Hex(canonicalRequest)].join('\n')
  const signingKey = await deriveSigningKey(input.secretAccessKey, dateStamp, input.region, input.service)
  const signature = toHex(await hmac(signingKey, stringToSign))
  const authorization = `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  return { authorization, signature, signedHeaders, canonicalRequest, stringToSign, amzDate, payloadHash }
}
