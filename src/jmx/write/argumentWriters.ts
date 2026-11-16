import type { TableRow } from '../../models/jmeter'
import { appendCollection, createElementProp } from './xmlPrimitives'
import type { CollectionField, XmlDocument } from './xmlPrimitives'

export function appendArguments(
  documentNode: XmlDocument,
  parent: Element,
  items: TableRow[],
  name = 'HTTPsampler.Arguments',
) {
  const args = createElementProp(documentNode, name, 'Arguments', 'HTTPArgumentsPanel', 'Arguments')
  args.setAttribute('enabled', 'true')
  const fields: CollectionField[] = [
    { key: 'name', property: 'Argument.name' },
    { key: 'value', property: 'Argument.value' },
    { key: 'metadata', property: 'Argument.metadata' },
    { key: 'encode', property: 'HTTPArgument.always_encode', type: 'bool' },
    { key: 'includeEquals', property: 'HTTPArgument.use_equals', type: 'bool' },
  ]
  if (name === 'TestPlan.user_defined_variables') {
    fields.splice(3, 0, { key: 'description', property: 'Argument.desc' })
  }
  appendCollection(documentNode, args, 'Arguments.arguments', 'HTTPArgument', items, fields)
  parent.appendChild(args)
}

export function appendFiles(documentNode: XmlDocument, parent: Element, items: TableRow[]) {
  const filesWrapper = createElementProp(documentNode, 'HTTPsampler.Files', 'HTTPFileArgs', 'HTTPFileArgsPanel', 'HTTPFileArgs')
  filesWrapper.setAttribute('enabled', 'true')
  appendCollection(documentNode, filesWrapper, 'HTTPFileArgs.files', 'HTTPFileArg', items, [
    { key: 'path', property: 'File.path' },
    { key: 'parameterName', property: 'File.paramname' },
    { key: 'mimeType', property: 'File.mimetype' },
  ])
  parent.appendChild(filesWrapper)
}

/** Argument rows (name/value/metadata) used by GRPC metadata and backend listener arguments. */
export const PLAIN_ARGUMENT_FIELDS: CollectionField[] = [
  { key: 'name', property: 'Argument.name' },
  { key: 'value', property: 'Argument.value' },
  { key: 'metadata', property: 'Argument.metadata' },
]
