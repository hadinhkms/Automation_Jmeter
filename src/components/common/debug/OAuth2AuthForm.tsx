import { useId } from 'react'
import { KeyRound, Loader2, Plus } from 'lucide-react'
import type { BearerNodes } from '../../../utils/auth/oauth2BearerNodes'
import type { OAuth2Config } from '../../../utils/auth/oauth2TokenFetcher'
import { AuthField } from './AuthField'
import { useOAuth2Wizard } from './useOAuth2Wizard'

interface OAuth2AuthFormProps {
  onInsert: (nodes: BearerNodes) => void
}

const mask = (token: string) => (token.length > 16 ? `${token.slice(0, 10)}…${token.slice(-4)}` : '••••')

/** OAuth 2.0 helper: fetch a token through the dev-server proxy, then add `Authorization: Bearer`. */
export function OAuth2AuthForm({ onInsert }: OAuth2AuthFormProps) {
  const w = useOAuth2Wizard()
  const radioName = useId()
  const { config, fieldErrors: errors } = w
  const text = (key: keyof OAuth2Config) => ({
    value: String(config[key]),
    error: errors[key],
    // SAFETY: key is a string field of OAuth2Config, so { [key]: string } is a valid partial
    onChange: (value: string) => w.update({ [key]: value } as Partial<OAuth2Config>),
  })

  const insert = () => {
    const nodes = w.buildNodes()
    if (nodes) onInsert(nodes)
  }

  return (
    <div className="auth-form">
      <div className="auth-grid">
        <label className="form-field">
          <span>Grant type</span>
          {/* // SAFETY: value comes from a select element whose option values are exactly this union */}
          <select value={config.grantType} onChange={(e) => w.update({ grantType: e.target.value as OAuth2Config['grantType'] })}>
            <option value="client_credentials">Client Credentials</option>
            <option value="password">Password</option>
          </select>
        </label>
        <label className="form-field">
          <span>Client authentication</span>
          {/* // SAFETY: value comes from a select element whose option values are exactly this union */}
          <select value={config.clientAuth} onChange={(e) => w.update({ clientAuth: e.target.value as OAuth2Config['clientAuth'] })}>
            <option value="body">Send in request body</option>
            <option value="basic">Basic Auth header</option>
          </select>
        </label>
        <AuthField label="Token URL" wide placeholder="https://auth.example.com/oauth/token" {...text('tokenUrl')} />
        <AuthField label="Client ID" {...text('clientId')} />
        <AuthField label="Client secret" type="password" hint="Prefer ${VAR} from the active environment" {...text('clientSecret')} />
        {config.grantType === 'password' ? (
          <>
            <AuthField label="Username" {...text('username')} />
            <AuthField label="Password" type="password" {...text('password')} />
          </>
        ) : null}
        <AuthField label="Scope (optional)" wide placeholder="read write" {...text('scope')} />
      </div>

      <div className="auth-actions">
        <span className="auth-note">Sent via the local proxy. The client secret is not saved; the fetched access token is stored in the test plan.</span>
        <button type="button" className="btn btn-secondary" disabled={w.fetching} onClick={() => void w.fetchToken()}>
          {w.fetching ? <Loader2 size={14} className="spin-icon" /> : <KeyRound size={14} />}
          {w.fetching ? 'Requesting…' : 'Get token'}
        </button>
      </div>

      {w.error ? <div className="auth-error" role="alert">{w.error}</div> : null}

      {w.token ? (
        <div className="auth-result">
          <div className="auth-token-line">
            <strong>{w.token.tokenType}</strong> <code>{mask(w.token.accessToken)}</code>
            {w.token.expiresIn ? <span> · expires in {Math.round(w.token.expiresIn / 60)} min</span> : null}
          </div>
          <div className="auth-target">
            <label><input type="radio" name={radioName} value="variable" checked={w.target === 'variable'} onChange={() => w.setTarget('variable')} /> Store in variable</label>
            <label><input type="radio" name={radioName} value="header" checked={w.target === 'header'} onChange={() => w.setTarget('header')} /> Literal header</label>
            {w.target === 'variable' ? (
              <AuthField label="Variable" value={w.varName} error={w.varNameError ?? undefined} onChange={w.setVarName} />
            ) : null}
          </div>
          <button type="button" className="btn btn-primary" disabled={Boolean(w.varNameError)} onClick={insert}>
            <Plus size={14} /> Add Authorization: Bearer header
          </button>
        </div>
      ) : null}
    </div>
  )
}
