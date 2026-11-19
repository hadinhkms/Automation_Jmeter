import { useState, useMemo } from 'react'
import { UploadCloud } from 'lucide-react'
import { CodeEditor } from '../../components/common/CodeEditor'
import { EditableTable } from '../../components/common/EditableTable'
import { CheckboxField, Section } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { boolProp, rowsProp, textProp } from '../editorUtils'
import { useSendRequest } from '../../components/common/debug/useSendRequest'
import { HttpRequestActionBar } from '../../components/common/debug/HttpRequestActionBar'
import { SendInspectPanel } from '../../components/common/debug/SendInspectPanel'
import { HttpConnectionFields } from './HttpConnectionFields'
import { buildCurlCommand } from './buildCurlCommand'
import { useHttpFileUpload } from './useHttpFileUpload'

export function HTTPRequestEditor({ node, updateProperties }: EditorProps) {
  const [tab, setTab] = useState<'parameters' | 'body' | 'files' | 'curl'>('parameters')
  const { fileUploadStatus, fileInputRef, handleUploadRequestFile } = useHttpFileUpload(node, updateProperties)
  const { isSending, debugResult, isPanelOpen, sendRequest, closePanel } = useSendRequest(node)

  const generatedCurl = useMemo(() => buildCurlCommand(node), [node])

  return (
    <>
      <HttpRequestActionBar
        node={node}
        isSending={isSending}
        canSend={Boolean(textProp(node, 'server') || textProp(node, 'domain'))}
        onSend={sendRequest}
        updateProperties={updateProperties}
      />
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
      {isPanelOpen && debugResult ? (
        <SendInspectPanel response={debugResult} onClose={closePanel} />
      ) : null}
    </>
  )
}
