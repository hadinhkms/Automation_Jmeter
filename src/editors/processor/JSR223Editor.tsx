import { CheckboxField, FormField, Section, SelectField } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { boolProp, textProp } from '../editorUtils'
import { CodeEditor } from '../../components/common/CodeEditor'

export function JSR223Editor({ node, updateProperties }: EditorProps) {
  const language = textProp(node, 'language', 'groovy')
  const script = textProp(node, 'script')

  return (
    <div className="jsr223-editor">
      <Section title="Script Language">
        <div className="form-grid two-columns">
          <SelectField
            label="Language"
            value={language}
            options={['groovy', 'javascript', 'java', 'beanshell']}
            onChange={(newLang) => updateProperties({ language: newLang })}
          />
          <FormField
            label="Parameters"
            value={textProp(node, 'parameters')}
            onChange={(parameters) => updateProperties({ parameters })}
          />
          <FormField
            label="Script File"
            value={textProp(node, 'scriptFile')}
            onChange={(scriptFile) => updateProperties({ scriptFile })}
          />
        </div>
        <CheckboxField
          label="Cache compiled script if available"
          checked={boolProp(node, 'cache', true)}
          onChange={(cache) => updateProperties({ cache })}
        />
      </Section>

      <div className="jsr223-script-section">
        <CodeEditor
          label="Script"
          language={language}
          value={script}
          minHeight={360}
          placeholder={'// Enter your ' + language + ' script here...\nlog.info("Running script");'}
          onChange={(newScript) => updateProperties({ script: newScript })}
        />
      </div>
    </div>
  )
}
