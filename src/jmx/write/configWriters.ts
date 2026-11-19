import type { ComponentWriter } from './types'
import { SHARE_MODE_ALL, shareModeToJmx } from '../../utils/ddt/csvShareMode'
import { appendCollection, propertySink, rows, value } from './xmlPrimitives'

/** HTTP header / cookie managers and CSV data set config elements. */
export const writeConfigComponent: ComponentWriter = (documentNode, element, node, type) => {
  const p = propertySink(documentNode, element)
  switch (type) {
    case 'HTTPHeaderManager':
      appendCollection(documentNode, element, 'HeaderManager.headers', 'Header', rows(node, 'headers'), [
        { key: 'name', property: 'Header.name' },
        { key: 'value', property: 'Header.value' },
      ])
      return true
    case 'HTTPCookieManager':
      p.bool('CookieManager.clearEachIteration', value(node, 'clearEachIteration', false))
      p.bool('CookieManager.controlledByThreadGroup', value(node, 'controlledByThreadGroup', false))
      appendCollection(documentNode, element, 'CookieManager.cookies', 'Cookie', rows(node, 'cookies'), [
        { key: 'name', property: 'Cookie.name' },
        { key: 'value', property: 'Cookie.value' },
        { key: 'domain', property: 'Cookie.domain' },
        { key: 'path', property: 'Cookie.path' },
        { key: 'secure', property: 'Cookie.secure', type: 'bool' },
        { key: 'expires', property: 'Cookie.expires' },
      ])
      return true
    case 'CSVDataSet':
      p.str('filename', value(node, 'filename'))
      p.str('fileEncoding', value(node, 'encoding', 'UTF-8'))
      p.str('variableNames', value(node, 'variableNames'))
      p.bool('ignoreFirstLine', value(node, 'ignoreFirstLine', false))
      p.str('delimiter', value(node, 'delimiter', ','))
      p.bool('quotedData', value(node, 'quotedData', false))
      p.bool('recycle', value(node, 'recycle', true))
      p.bool('stopThread', value(node, 'stopThread', false))
      p.str('shareMode', shareModeToJmx(value(node, 'sharingMode', SHARE_MODE_ALL), value(node, 'identifier', '')))
      return true
    default:
      return false
  }
}
