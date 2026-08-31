import { useState } from 'react'
import { EditableTable } from '../components/common/EditableTable'
import {
  CheckboxField,
  FormField,
  RadioGroup,
  Section,
  SelectField,
  TextAreaField,
} from '../components/common/FormControls'
import type { EditorProps } from './editorUtils'
import { boolProp, numberProp, rowsProp, textProp } from './editorUtils'

export function TestPlanEditor({ node, updateProperties }: EditorProps) {
  return (
    <>
      <Section title="User Defined Variables">
        <EditableTable
          columns={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }]}
          rows={rowsProp(node, 'variables')}
          newRow={{ name: '', value: '' }}
          onChange={(variables) => updateProperties({ variables })}
        />
      </Section>
      <Section title="Test Plan Options">
        <div className="checkbox-stack">
          <CheckboxField label="Functional Test Mode" checked={boolProp(node, 'functionalMode')} onChange={(functionalMode) => updateProperties({ functionalMode })} />
          <CheckboxField label="Run tearDown Thread Groups after shutdown" checked={boolProp(node, 'tearDownAfterShutdown', true)} onChange={(tearDownAfterShutdown) => updateProperties({ tearDownAfterShutdown })} />
          <CheckboxField label="Serialize Thread Groups" checked={boolProp(node, 'serializeThreadGroups')} onChange={(serializeThreadGroups) => updateProperties({ serializeThreadGroups })} />
        </div>
      </Section>
    </>
  )
}

export function UserDefinedVariablesEditor({ node, updateProperties }: EditorProps) {
  return (
    <Section title="Variables">
      <EditableTable
        columns={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }]}
        rows={rowsProp(node, 'variables')}
        newRow={{ name: '', value: '' }}
        onChange={(variables) => updateProperties({ variables })}
      />
    </Section>
  )
}

export function ThreadGroupEditor({ node, updateProperties }: EditorProps) {
  const threads = numberProp(node, 'threads', 1)
  const rampUp = numberProp(node, 'rampUp')
  const loops = numberProp(node, 'loops', 1)
  const duration = numberProp(node, 'duration')
  const startupDelay = numberProp(node, 'startupDelay')
  const scheduler = boolProp(node, 'scheduler')
  const numeric = (key: string) => (value: string) => updateProperties({ [key]: value === '' ? '' : Number(value) })

  return (
    <>
      <Section title="Action to be taken after a Sampler error">
        <RadioGroup
          legend="Sampler error action"
          value={textProp(node, 'onError', 'continue')}
          onChange={(onError) => updateProperties({ onError })}
          options={[
            { value: 'continue', label: 'Continue' },
            { value: 'next-loop', label: 'Start Next Thread Loop' },
            { value: 'stop-thread', label: 'Stop Thread' },
            { value: 'stop-test', label: 'Stop Test' },
            { value: 'stop-now', label: 'Stop Test Now' },
          ]}
        />
      </Section>
      <Section title="Thread Properties">
        <div className="form-grid three-columns">
          <FormField label="Number of Threads (users)" type="number" min={1} value={textProp(node, 'threads', '1')} error={threads < 1 ? 'Must be at least 1' : undefined} onChange={numeric('threads')} />
          <FormField label="Ramp-up Period (seconds)" type="number" min={0} value={textProp(node, 'rampUp', '0')} error={rampUp < 0 ? 'Cannot be negative' : undefined} onChange={numeric('rampUp')} />
          <FormField label="Loop Count" type="number" min={1} value={textProp(node, 'loops', '1')} error={loops < 1 ? 'Must be at least 1' : undefined} onChange={numeric('loops')} />
        </div>
        <div className="checkbox-stack inline-checks">
          <CheckboxField label="Same user on each iteration" checked={boolProp(node, 'sameUser', true)} onChange={(sameUser) => updateProperties({ sameUser })} />
          <CheckboxField label="Delay Thread creation until needed" checked={boolProp(node, 'delayedStart')} onChange={(delayedStart) => updateProperties({ delayedStart })} />
          <CheckboxField label="Scheduler" checked={scheduler} onChange={(value) => updateProperties({ scheduler: value })} />
        </div>
        {scheduler ? (
          <div className="form-grid two-columns scheduler-fields">
            <FormField label="Duration (seconds)" type="number" min={0} value={textProp(node, 'duration', '0')} error={duration < 0 ? 'Cannot be negative' : undefined} onChange={numeric('duration')} />
            <FormField label="Startup Delay (seconds)" type="number" min={0} value={textProp(node, 'startupDelay', '0')} error={startupDelay < 0 ? 'Cannot be negative' : undefined} onChange={numeric('startupDelay')} />
          </div>
        ) : null}
      </Section>
    </>
  )
}

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

function HttpConnectionFields({ node, updateProperties, includeMethod }: EditorProps & { includeMethod: boolean }) {
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

export function HTTPRequestEditor({ node, updateProperties }: EditorProps) {
  const [tab, setTab] = useState<'parameters' | 'body' | 'files'>('parameters')
  return (
    <>
      <Section title="Web Server">
        <HttpConnectionFields node={node} updateProperties={updateProperties} includeMethod />
      </Section>
      <Section title="Request Options">
        <div className="checkbox-stack inline-checks">
          <CheckboxField label="Follow Redirects" checked={boolProp(node, 'followRedirects', true)} onChange={(followRedirects) => updateProperties({ followRedirects })} />
          <CheckboxField label="Auto Redirects" checked={boolProp(node, 'autoRedirects')} onChange={(autoRedirects) => updateProperties({ autoRedirects })} />
          <CheckboxField label="Use KeepAlive" checked={boolProp(node, 'keepAlive', true)} onChange={(keepAlive) => updateProperties({ keepAlive })} />
          <CheckboxField label="Use multipart/form-data" checked={boolProp(node, 'multipart')} onChange={(multipart) => updateProperties({ multipart })} />
          <CheckboxField label="Browser-compatible headers" checked={boolProp(node, 'browserCompatible')} onChange={(browserCompatible) => updateProperties({ browserCompatible })} />
        </div>
      </Section>
      <div className="tabbed-panel">
        <div className="tab-list" role="tablist">
          {(['parameters', 'body', 'files'] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
              {item === 'parameters' ? 'Parameters' : item === 'body' ? 'Body Data' : 'Files Upload'}
            </button>
          ))}
        </div>
        <div className="tab-content" role="tabpanel">
          {tab === 'parameters' ? (
            <EditableTable
              columns={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }, { key: 'encode', label: 'Encode?', type: 'checkbox' }, { key: 'includeEquals', label: 'Include Equals?', type: 'checkbox' }]}
              rows={rowsProp(node, 'parameters')}
              newRow={{ name: '', value: '', encode: true, includeEquals: true }}
              onChange={(parameters) => updateProperties({ parameters })}
            />
          ) : null}
          {tab === 'body' ? (
            <TextAreaField label="Body Data" value={textProp(node, 'body')} rows={13} monospace placeholder="Request body" onChange={(body) => updateProperties({ body })} />
          ) : null}
          {tab === 'files' ? (
            <EditableTable
              columns={[{ key: 'path', label: 'File Path' }, { key: 'parameterName', label: 'Parameter Name' }, { key: 'mimeType', label: 'MIME Type' }]}
              rows={rowsProp(node, 'files')}
              newRow={{ path: '', parameterName: '', mimeType: '' }}
              onChange={(files) => updateProperties({ files })}
            />
          ) : null}
        </div>
      </div>
    </>
  )
}

export function HTTPRequestDefaultsEditor(props: EditorProps) {
  return <Section title="Web Server Defaults"><HttpConnectionFields {...props} includeMethod={false} /></Section>
}
