import { useState } from 'react'
import { proxyDebugService } from '../../../services/proxyDebugService'
import { useEnvironmentStore } from '../../../store/environmentStore'
import { resolveVariables } from '../../../utils/postman/dynamicVariablesEngine'
import { buildBearerNodes, validateTokenVarName, type BearerNodes, type BearerTarget } from '../../../utils/auth/oauth2BearerNodes'
import {
  fetchOAuth2Token,
  OAUTH2_DEFAULTS,
  validateOAuth2Config,
  type OAuth2Config,
  type OAuth2Token,
} from '../../../utils/auth/oauth2TokenFetcher'

/** OAuth 2.0 form state. Secrets live only in this component state; `${VAR}` values resolve from the active environment. */
export function useOAuth2Wizard() {
  const [config, setConfig] = useState<OAuth2Config>(OAUTH2_DEFAULTS)
  const [token, setToken] = useState<OAuth2Token | null>(null)
  const [error, setError] = useState('')
  const [fetching, setFetching] = useState(false)
  const [touched, setTouched] = useState(false)
  const [target, setTarget] = useState<BearerTarget>('variable')
  const [varName, setVarName] = useState('ACCESS_TOKEN')

  const update = (patch: Partial<OAuth2Config>) => {
    setConfig((current) => ({ ...current, ...patch }))
    setToken(null)
  }

  const fieldErrors = touched ? validateOAuth2Config(config) : {}
  const varNameError = target === 'variable' ? validateTokenVarName(varName) : null

  const fetchToken = async () => {
    setTouched(true)
    if (Object.keys(validateOAuth2Config(config)).length > 0) return
    setFetching(true)
    setError('')
    setToken(null)
    try {
      const envVars = useEnvironmentStore.getState().getActiveVariables()
      const result = await fetchOAuth2Token(
        config,
        (request) => proxyDebugService.sendSingleRequest(request),
        (text) => resolveVariables(text, envVars),
      )
      if (result.ok) setToken(result.token)
      else setError(result.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetching(false)
    }
  }

  const buildNodes = (): BearerNodes | null => {
    if (!token || varNameError) return null
    return buildBearerNodes(token.accessToken, target, varName, token.tokenType)
  }

  return {
    config, update, token, error, fetching, fieldErrors,
    target, setTarget, varName, setVarName, varNameError,
    fetchToken, buildNodes,
  }
}
