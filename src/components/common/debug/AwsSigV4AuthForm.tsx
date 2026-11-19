import { useState } from 'react'
import { Code2, Plus } from 'lucide-react'
import type { TestPlanNode } from '../../../models/jmeter'
import {
  createSigV4PreProcessor,
  generateSigV4Script,
  SIGV4_DEFAULTS,
  SIGV4_NODE_NAME,
  validateSigV4Options,
  type SigV4WizardOptions,
} from '../../../utils/auth/awsSigV4Generator'
import { useJMeterStore } from '../../../store/jmeterStore'
import { resolveCascadedHeaders } from '../../../utils/headerScoping'
import { AuthField } from './AuthField'

interface AwsSigV4AuthFormProps {
  sampler: TestPlanNode
  onInsert: (node: TestPlanNode) => void
}

/** AWS SigV4 helper: generates a Groovy JSR223 PreProcessor that signs each request at run time. */
export function AwsSigV4AuthForm({ sampler, onInsert }: AwsSigV4AuthFormProps) {
  const [options, setOptions] = useState<SigV4WizardOptions>(SIGV4_DEFAULTS)
  const [showScript, setShowScript] = useState(false)
  const errors = validateSigV4Options(options)
  const valid = Object.keys(errors).length === 0
  const testPlan = useJMeterStore((state) => state.testPlan)
  const scopedAuth = resolveCascadedHeaders(sampler, testPlan).find((header) => header.name.toLowerCase() === 'authorization')
  const existing = sampler.children.some((child) => child.type === 'JSR223PreProcessor' && child.name === SIGV4_NODE_NAME)
  const field = (key: Exclude<keyof SigV4WizardOptions, 'signPayloadHeader'>) => ({
    value: options[key],
    error: errors[key],
    onChange: (value: string) => setOptions((current) => ({ ...current, [key]: value })),
  })

  return (
    <div className="auth-form">
      <p className="auth-note">
        Enter the <strong>names</strong> of the JMeter variables, <code>-J</code> properties or environment variables that hold your keys —
        never the keys themselves. The script signs each request with HMAC-SHA256 when it runs.
      </p>
      <div className="auth-grid">
        <AuthField label="Region" placeholder="us-east-1" {...field('region')} />
        <AuthField label="Service" placeholder="execute-api" {...field('service')} />
        <AuthField label="Access key variable" {...field('accessKeyVar')} />
        <AuthField label="Secret key variable" {...field('secretKeyVar')} />
        <AuthField label="Session token variable (optional)" placeholder="AWS_SESSION_TOKEN" {...field('sessionTokenVar')} />
        <label className="auth-check">
          <input
            type="checkbox"
            checked={options.service.trim() === 's3' || options.signPayloadHeader}
            disabled={options.service.trim() === 's3'}
            onChange={(e) => setOptions((current) => ({ ...current, signPayloadHeader: e.target.checked }))}
          />
          Send &amp; sign X-Amz-Content-Sha256 (required for S3)
        </label>
      </div>

      {existing ? (
        <div className="auth-error" role="status">This sampler already has an “{SIGV4_NODE_NAME}”. Edit or delete it in the tree first.</div>
      ) : null}

      {scopedAuth ? (
        <div className="auth-warning" role="status">
          This request already sends an <code>Authorization</code> header (<code>{scopedAuth.value.slice(0, 24)}{scopedAuth.value.length > 24 ? '…' : ''}</code>).
          The signer replaces it for this request only; other samplers keep it.
        </div>
      ) : null}

      <div className="auth-actions">
        <button type="button" className="text-button" aria-pressed={showScript} disabled={!valid} onClick={() => setShowScript((v) => !v)}>
          <Code2 size={13} /> {showScript ? 'Hide script' : 'Preview script'}
        </button>
        <button type="button" className="btn btn-primary" disabled={!valid || existing} onClick={() => onInsert(createSigV4PreProcessor(options))}>
          <Plus size={14} /> Add SigV4 PreProcessor
        </button>
      </div>

      {showScript && valid ? <pre className="auth-script">{generateSigV4Script(options)}</pre> : null}
    </div>
  )
}
