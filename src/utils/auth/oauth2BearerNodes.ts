/** Turns a fetched OAuth 2.0 token into JMeter nodes (Header Manager, optionally a UDV variable). */
import type { TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'
import { authScheme } from './oauth2TokenResponse'

export type BearerTarget = 'variable' | 'header'

export interface BearerNodes {
  /** Goes under the HTTP sampler. */
  headerManager: TestPlanNode
  /** Goes at Test Plan level (only for the 'variable' target). */
  variables: TestPlanNode | null
}

const VAR_NAME = /^[A-Za-z_][A-Za-z0-9_.]{0,63}$/

export function validateTokenVarName(name: string): string | null {
  return VAR_NAME.test(name.trim()) ? null : 'Variable names use letters, digits, _ or . and must not start with a digit'
}

/**
 * 'variable' (recommended): UDV `name = token` at plan level + header `Bearer ${name}`, so the token is replaced in one place.
 * 'header': the literal token goes straight into the sampler's Header Manager.
 * The scheme is the response's `token_type` (`Bearer` unless the server says otherwise).
 */
export function buildBearerNodes(accessToken: string, target: BearerTarget, varName = 'ACCESS_TOKEN', tokenType?: string): BearerNodes {
  const token = accessToken.trim()
  const scheme = authScheme(tokenType)
  if (!token) throw new Error('No access token to insert.')
  if (target === 'variable') {
    const error = validateTokenVarName(varName)
    if (error) throw new Error(error)
    const name = varName.trim()
    return {
      headerManager: createNode('HTTPHeaderManager', 'OAuth2 Bearer Header', {
        headers: [{ name: 'Authorization', value: `${scheme} \${${name}}` }],
      }),
      variables: createNode('UserDefinedVariables', 'OAuth2 Token', {
        variables: [{ name, value: token, description: 'OAuth 2.0 access token (expires) - re-fetch via Auth wizard' }],
      }),
    }
  }
  return {
    headerManager: createNode('HTTPHeaderManager', 'OAuth2 Bearer Header', {
      headers: [{ name: 'Authorization', value: `${scheme} ${token}` }],
    }),
    variables: null,
  }
}

/** Node created by an earlier "Apply" (same type + name directly under `parent`), so re-applying updates it instead of duplicating. */
export function findAppliedNode(parent: TestPlanNode | null, candidate: TestPlanNode): TestPlanNode | null {
  return parent?.children.find((child) => child.type === candidate.type && child.name === candidate.name) ?? null
}
