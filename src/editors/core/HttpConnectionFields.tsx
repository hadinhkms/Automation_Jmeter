import { FormField, SelectField } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { textProp } from '../editorUtils'

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export function HttpConnectionFields({ node, updateProperties, includeMethod }: EditorProps & { includeMethod: boolean }) {
  const portValue = textProp(node, 'port')
  const port = portValue === '' ? null : Number(portValue)
  const portError = port !== null && (!Number.isInteger(port) || port < 1 || port > 65535)
    ? 'Enter an integer from 1 to 65535'
    : undefined
  return (
    <div className="form-grid http-fields">
      <FormField label="Protocol" value={textProp(node, 'protocol')} placeholder="https" onChange={(protocol) => updateProperties({ protocol })} />
      <FormField label="Server Name or IP" value={textProp(node, 'server')} placeholder="api.example.com" onChange={(server) => updateProperties({ server })} />
      <FormField label="Port Number" value={portValue} error={portError} placeholder="443" onChange={(port) => updateProperties({ port })} />
      {includeMethod ? <SelectField label="HTTP Request Method" value={textProp(node, 'method', 'GET')} options={httpMethods} onChange={(method) => updateProperties({ method })} /> : null}
      <FormField label="Path" value={textProp(node, 'path')} placeholder="/api/resource" onChange={(path) => updateProperties({ path })} />
      <FormField label="Content Encoding" value={textProp(node, 'contentEncoding')} placeholder="UTF-8" onChange={(contentEncoding) => updateProperties({ contentEncoding })} />
    </div>
  )
}
