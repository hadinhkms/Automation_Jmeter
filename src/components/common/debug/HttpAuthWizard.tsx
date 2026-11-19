import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type { TestPlanNode } from '../../../models/jmeter'
import { useJMeterStore } from '../../../store/jmeterStore'
import type { BearerNodes } from '../../../utils/auth/oauth2BearerNodes'
import { applyAuthNodes } from '../../../utils/auth/applyAuthNodes'
import { AwsSigV4AuthForm } from './AwsSigV4AuthForm'
import { OAuth2AuthForm } from './OAuth2AuthForm'
import './authWizard.css'

interface HttpAuthWizardProps {
  node: TestPlanNode
  onClose: () => void
}

type AuthTab = 'oauth2' | 'sigv4'

/** FEAT-P7: Auth helpers panel inside the HTTP Request editor (OAuth 2.0 token / AWS SigV4 signer). */
export function HttpAuthWizard({ node, onClose }: HttpAuthWizardProps) {
  const [tab, setTab] = useState<AuthTab>('oauth2')
  const [notice, setNotice] = useState('')

  /**
   * Adds children under this sampler (and plan-level nodes under Test Plan), then keeps the sampler selected.
   * A node with the same type + name from an earlier Apply is updated in place instead of duplicated.
   */
  const insert = (children: TestPlanNode[], planLevel: TestPlanNode | null, message: string) => {
    const store = useJMeterStore.getState()
    const updated = applyAuthNodes(
      { getTestPlan: () => useJMeterStore.getState().testPlan, insertNode: store.insertNode, updateNodeProperties: store.updateNodeProperties },
      node.id, children, planLevel,
    )
    store.selectNode(node.id)
    setNotice(updated ? message.replace(/^Added/, 'Updated') : message)
  }

  const insertBearer = (nodes: BearerNodes) => {
    const where = nodes.variables ? ` and “${nodes.variables.name}” variables at Test Plan level` : ''
    insert([nodes.headerManager], nodes.variables, `Added “${nodes.headerManager.name}” under this sampler${where}.`)
  }

  return (
    <section className="auth-wizard" aria-label="Auth helpers">
      <div className="auth-wizard-head">
        <div className="tab-list auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'oauth2'} className={tab === 'oauth2' ? 'active' : ''} onClick={() => setTab('oauth2')}>
            OAuth 2.0
          </button>
          <button type="button" role="tab" aria-selected={tab === 'sigv4'} className={tab === 'sigv4' ? 'active' : ''} onClick={() => setTab('sigv4')}>
            AWS Signature v4
          </button>
        </div>
        <button type="button" className="modal-close-button" aria-label="Close auth helpers" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      {notice ? (
        <div className="auth-success" role="status"><CheckCircle2 size={14} /> {notice}</div>
      ) : null}

      <div role="tabpanel">
        {tab === 'oauth2' ? (
          <OAuth2AuthForm onInsert={insertBearer} />
        ) : (
          <AwsSigV4AuthForm
            sampler={node}
            onInsert={(preProcessor) => insert([preProcessor], null, `Added “${preProcessor.name}” under this sampler.`)}
          />
        )}
      </div>
    </section>
  )
}
