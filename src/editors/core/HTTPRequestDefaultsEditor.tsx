import { Section } from '../../components/common/FormControls'
import type { EditorProps } from '../editorUtils'
import { HttpConnectionFields } from './HttpConnectionFields'

export function HTTPRequestDefaultsEditor(props: EditorProps) {
  return <Section title="Web Server Defaults"><HttpConnectionFields {...props} includeMethod={false} /></Section>
}
