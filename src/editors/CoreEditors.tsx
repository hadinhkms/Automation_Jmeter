import { useRef, useState, useMemo } from 'react'
import { UploadCloud } from 'lucide-react'
import { CodeEditor } from '../components/common/CodeEditor'
import { EditableTable } from '../components/common/EditableTable'
import {
  CheckboxField,
  FormField,
  RadioGroup,
  Section,
  SelectField,
} from '../components/common/FormControls'


import type { EditorProps } from './editorUtils'
import { boolProp, numberProp, rowsProp, textProp } from './editorUtils'
import { projectAssetService } from '../services/projectAssetService'

export function TestPlanEditor({ node, updateProperties }: EditorProps) {
  return (
    <>
      <Section title="User Defined Variables">
        <EditableTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'value', label: 'Value' },
            { key: 'description', label: 'Description' },
          ]}
          rows={rowsProp(node, 'variables')}
          newRow={{ name: '', value: '', description: '' }}
          onChange={(variables) => updateProperties({ variables })}
        />
      </Section>

      <Section title="Test Plan Options">
        <div className="checkbox-stack">
          <CheckboxField
            label="Run Thread Groups consecutively (i.e. run one at a time)"
            checked={boolProp(node, 'serializeThreadGroups')}
            onChange={(serializeThreadGroups) => updateProperties({ serializeThreadGroups })}
          />
          <CheckboxField
            label="Run tearDown Thread Groups after shutdown of main threads"
            checked={boolProp(node, 'tearDownAfterShutdown', true)}
            onChange={(tearDownAfterShutdown) => updateProperties({ tearDownAfterShutdown })}
          />
          <CheckboxField
            label="Functional Test Mode (i.e. save Response Data and SamplerData)"
            checked={boolProp(node, 'functionalMode')}
            onChange={(functionalMode) => updateProperties({ functionalMode })}
          />
        </div>
      </Section>

      <Section title="Add directory or jar to classpath">
        <EditableTable
          columns={[{ key: 'path', label: 'Library / JAR / Directory Path' }]}
          rows={rowsProp(node, 'userDefinedClasspath')}
          newRow={{ path: '' }}
          onChange={(userDefinedClasspath) => updateProperties({ userDefinedClasspath })}
        />
      </Section>
    </>
  )
}


export function UserDefinedVariablesEditor({ node, updateProperties }: EditorProps) {
  return (
    <Section title="Variables">
      <EditableTable
        columns={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }, { key: 'description', label: 'Description' }]}
        rows={rowsProp(node, 'variables')}
        newRow={{ name: '', value: '', description: '' }}
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
  const [tab, setTab] = useState<'parameters' | 'body' | 'files' | 'curl'>('parameters')
  const [fileUploadStatus, setFileUploadStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generatedCurl = useMemo(() => {
    const protocol = textProp(node, 'protocol') || 'https'
    const domain = textProp(node, 'domain') || 'apiv2.vieclam24h.vn'
    const port = textProp(node, 'port') ? `:${textProp(node, 'port')}` : ''
    const path = textProp(node, 'path') || '/'
    const method = (textProp(node, 'method') || 'GET').toUpperCase()
    const body = textProp(node, 'body') || ''
    const params = rowsProp(node, 'parameters')

    let queryString = ''
    if (params.length > 0) {
      const validParams = params.filter((p) => p.name)
      if (validParams.length > 0) {
        queryString =
          (path.includes('?') ? '&' : '?') +
          validParams.map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value || '')}`).join('&')
      }
    }

    const url = `${protocol}://${domain}${port}${path}${queryString}`
    const parts: string[] = []
    parts.push(`curl --location --request ${method} '${url}'`)
    parts.push(`  --header 'Accept: application/json'`)
    if (body || method === 'POST' || method === 'PUT' || method === 'PATCH') {
      parts.push(`  --header 'Content-Type: application/json'`)
    }
    if (body) {
      parts.push(`  --data-raw '${body.replace(/'/g, "\\'")}'`)
    }
    return parts.join(' \\\n')
  }, [node])

  const handleUploadRequestFile = async (file: File) => {
    setFileUploadStatus('Uploading request file...')
    try {
      const uploaded = await projectAssetService.uploadAsset(file, 'data')
      updateProperties({
        files: [
          ...rowsProp(node, 'files'),
          {
            path: uploaded.relativePath,
            parameterName: file.name.replace(/\.[^.]+$/, ''),
            mimeType: file.type || 'application/octet-stream',
          },
        ],
        multipart: true,
      })
      setFileUploadStatus(`Uploaded ${uploaded.relativePath}`)
    } catch (error) {
      setFileUploadStatus(error instanceof Error ? `Upload failed: ${error.message}` : 'Upload failed')
    }
  }

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
          {(['parameters', 'body', 'files', 'curl'] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
              {item === 'parameters' ? 'Parameters' : item === 'body' ? 'Body Data' : item === 'files' ? 'Files Upload' : 'cURL Command'}
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
            <div className="http-body-editor-wrap">
              <CodeEditor
                label="Body Data (JSON / Payload)"
                language="json"
                value={textProp(node, 'body')}
                minHeight={340}
                placeholder={'{\n  "key": "value"\n}'}
                onChange={(body) => updateProperties({ body })}
              />
            </div>
          ) : null}

          {tab === 'files' ? (
            <div className="request-files-panel">
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) handleUploadRequestFile(file)
                }}
              />
              <div className="asset-toolbar">
                <button type="button" className="text-button" onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud size={14} /> Upload File
                </button>
                {fileUploadStatus ? <span className="asset-upload-status inline">{fileUploadStatus}</span> : null}
              </div>
              <EditableTable
                columns={[{ key: 'path', label: 'File Path' }, { key: 'parameterName', label: 'Parameter Name' }, { key: 'mimeType', label: 'MIME Type' }]}
                rows={rowsProp(node, 'files')}
                newRow={{ path: '', parameterName: '', mimeType: '' }}
                onChange={(files) => updateProperties({ files })}
              />
            </div>
          ) : null}

          {tab === 'curl' ? (
            <div className="http-curl-editor-wrap">
              <CodeEditor
                label="cURL Command (Bash / CLI)"
                language="curl"
                value={generatedCurl}
                minHeight={340}
                onChange={() => {}}
              />
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}


export function HTTPRequestDefaultsEditor(props: EditorProps) {
  return <Section title="Web Server Defaults"><HttpConnectionFields {...props} includeMethod={false} /></Section>
}

export function DebugSamplerEditor({ node, updateProperties }: EditorProps) {
  return (
    <>
      <Section title="Debug Sampler Properties">
        <div className="two-columns">
          <SelectField
            label="JMeter properties"
            value={boolProp(node, 'displayJMeterProperties', false) ? 'true' : 'false'}
            options={[
              { label: 'False', value: 'false' },
              { label: 'True', value: 'true' },
            ]}
            onChange={(val) => updateProperties({ displayJMeterProperties: val === 'true' })}
          />
          <SelectField
            label="JMeter variables"
            value={boolProp(node, 'displayJMeterVariables', true) ? 'true' : 'false'}
            options={[
              { label: 'True', value: 'true' },
              { label: 'False', value: 'false' },
            ]}
            onChange={(val) => updateProperties({ displayJMeterVariables: val === 'true' })}
          />
          <SelectField
            label="Sampler properties"
            value={boolProp(node, 'displaySamplerProperties', false) ? 'true' : 'false'}
            options={[
              { label: 'False', value: 'false' },
              { label: 'True', value: 'true' },
            ]}
            onChange={(val) => updateProperties({ displaySamplerProperties: val === 'true' })}
          />
          <SelectField
            label="System properties"
            value={boolProp(node, 'displaySystemProperties', false) ? 'true' : 'false'}
            options={[
              { label: 'False', value: 'false' },
              { label: 'True', value: 'true' },
            ]}
            onChange={(val) => updateProperties({ displaySystemProperties: val === 'true' })}
          />
        </div>
      </Section>
    </>
  )
}
