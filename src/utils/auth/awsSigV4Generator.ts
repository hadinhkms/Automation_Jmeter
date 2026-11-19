/** AWS SigV4 Auth Wizard: validates the form and builds the Groovy JSR223 PreProcessor node. */
import type { TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'
import { renderSigV4Groovy } from './awsSigV4Groovy'

export interface SigV4WizardOptions {
  region: string
  service: string
  /** Names of the variables / properties / env vars that hold the keys — never the keys themselves. */
  accessKeyVar: string
  secretKeyVar: string
  sessionTokenVar: string
  signPayloadHeader: boolean
}

export const SIGV4_DEFAULTS: SigV4WizardOptions = {
  region: 'us-east-1',
  service: 'execute-api',
  accessKeyVar: 'AWS_ACCESS_KEY_ID',
  secretKeyVar: 'AWS_SECRET_ACCESS_KEY',
  sessionTokenVar: '',
  signPayloadHeader: true,
}

export const SIGV4_NODE_NAME = 'AWS SigV4 Signer'

const REGION = /^[a-z]{2}(-[a-z]+)+-\d{1,2}$/
const SERVICE = /^[a-z0-9][a-z0-9-]{0,62}$/
const VAR_NAME = /^[A-Za-z_][A-Za-z0-9_.]{0,63}$/
const ACCESS_KEY_LIKE = /^(AKIA|ASIA)[A-Z0-9]{12,}$/
const SECRET_LIKE = /^[A-Za-z0-9/+=]{40}$/

function checkVarName(value: string, required: boolean): string | undefined {
  const name = value.trim()
  if (!name) return required ? 'Required' : undefined
  if (ACCESS_KEY_LIKE.test(name) || SECRET_LIKE.test(name)) {
    return 'This looks like a real key. Enter the variable name that holds it (e.g. AWS_ACCESS_KEY_ID).'
  }
  if (!VAR_NAME.test(name)) return 'Variable names use letters, digits, _ or . (no ${ })'
  return undefined
}

export function validateSigV4Options(options: SigV4WizardOptions): Partial<Record<keyof SigV4WizardOptions, string>> {
  const errors: Partial<Record<keyof SigV4WizardOptions, string>> = {}
  if (!REGION.test(options.region.trim())) errors.region = 'AWS region code, e.g. us-east-1 or ap-southeast-1'
  if (!SERVICE.test(options.service.trim())) errors.service = 'Service signing name, e.g. execute-api, s3, lambda'
  const access = checkVarName(options.accessKeyVar, true)
  if (access) errors.accessKeyVar = access
  const secret = checkVarName(options.secretKeyVar, true)
  if (secret) errors.secretKeyVar = secret
  const token = checkVarName(options.sessionTokenVar, false)
  if (token) errors.sessionTokenVar = token
  return errors
}

export function generateSigV4Script(options: SigV4WizardOptions): string {
  return renderSigV4Groovy({
    region: options.region.trim(),
    service: options.service.trim(),
    accessKeyVar: options.accessKeyVar.trim(),
    secretKeyVar: options.secretKeyVar.trim(),
    sessionTokenVar: options.sessionTokenVar.trim(),
    signPayloadHeader: options.service.trim() === 's3' ? true : options.signPayloadHeader,
  })
}

/** Builds the JSR223 PreProcessor; throws if the options are invalid. */
export function createSigV4PreProcessor(options: SigV4WizardOptions): TestPlanNode {
  const errors = validateSigV4Options(options)
  const first = Object.entries(errors)[0]
  if (first) throw new Error(`${first[0]}: ${first[1]}`)
  return createNode('JSR223PreProcessor', SIGV4_NODE_NAME, {
    language: 'groovy',
    cache: true,
    script: generateSigV4Script(options),
    comments: `AWS SigV4 for ${options.service.trim()} in ${options.region.trim()}`,
  })
}
