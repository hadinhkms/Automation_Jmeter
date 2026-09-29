import type { TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'
import type { PostmanItem } from './postmanTypes'
import { normalizePostmanUrl } from './postmanVariableConverter'
import { transpileVariablesToJMeter } from './dynamicVariablesEngine'
import { transpilePostmanScript } from './postmanScriptTranspiler'

export interface ConvertRequestOptions {
  autoConvertVars: boolean
  generateHeaderManager: boolean
}

export function convertPostmanRequestToNode(
  item: PostmanItem,
  options: ConvertRequestOptions,
): TestPlanNode {
  const req = item.request
  const name = item.name || 'HTTP Request'
  if (!req) {
    return createNode('HTTPRequest', name)
  }

  const { protocol, domain, port, path } = normalizePostmanUrl(req.url)
  const method = (req.method || 'GET').toUpperCase()

  let bodyData = ''
  if (req.body?.mode === 'raw' && req.body.raw) {
    bodyData = options.autoConvertVars
      ? transpileVariablesToJMeter(req.body.raw)
      : req.body.raw
  }

  const children: TestPlanNode[] = []

  // Extract headers
  const headers: Array<{ name: string; value: string }> = []
  if (req.header && Array.isArray(req.header)) {
    for (const h of req.header) {
      if (!h.disabled && h.key) {
        const val = options.autoConvertVars ? transpileVariablesToJMeter(h.value) : h.value
        headers.push({ name: h.key, value: val })
      }
    }
  }

  // Handle Auth
  if (req.auth?.type === 'bearer' && req.auth.bearer) {
    const tokenObj = req.auth.bearer.find((b) => b.key === 'token')
    if (tokenObj && tokenObj.value) {
      const token = options.autoConvertVars
        ? transpileVariablesToJMeter(tokenObj.value)
        : tokenObj.value
      headers.push({ name: 'Authorization', value: `Bearer ${token}` })
    }
  } else if (req.auth?.type === 'basic' && req.auth.basic) {
    const user = req.auth.basic.find((b) => b.key === 'username')?.value || ''
    const pass = req.auth.basic.find((b) => b.key === 'password')?.value || ''
    if (user || pass) {
      const basicVal = btoa(`${user}:${pass}`)
      headers.push({ name: 'Authorization', value: `Basic ${basicVal}` })
    }
  }

  if (options.generateHeaderManager && headers.length > 0) {
    children.push(
      createNode('HTTPHeaderManager', 'HTTP Header Manager', {
        headers,
      }),
    )
  }

  // Transpile Chai / Postman test assertions
  if (Array.isArray(item.event)) {
    for (const ev of item.event) {
      if (ev.listen === 'test' && ev.script?.exec) {
        const rawScript = Array.isArray(ev.script.exec) ? ev.script.exec.join('\n') : String(ev.script.exec)
        const assertions = transpilePostmanScript(rawScript, name)
        children.push(...assertions)
      }
    }
  }

  return createNode(
    'HTTPRequest',
    name,
    {
      protocol,
      server: domain,
      port,
      method,
      path,
      body: bodyData,
      useMultipart: req.body?.mode === 'formdata',
    },
    children,
  )
}
