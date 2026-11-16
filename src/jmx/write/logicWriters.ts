import type { TestPlanNode } from '../../models/jmeter'
import type { ComponentWriter } from './types'
import { propertySink, value } from './xmlPrimitives'
import type { XmlDocument } from './xmlPrimitives'

function writeModuleControllerPath(documentNode: XmlDocument, element: Element, node: TestPlanNode) {
  const nodePath = value(node, 'nodePath', '')
  const collection = documentNode.createElement('collectionProp')
  collection.setAttribute('name', 'ModuleController.node_path')
  if (nodePath) {
    const parts = String(nodePath).split(',').filter(p => p.trim())
    parts.forEach((part) => {
      const pathElement = documentNode.createElement('stringProp')
      pathElement.textContent = part.trim()
      collection.appendChild(pathElement)
    })
  }
  element.appendChild(collection)
}

/** Logic controllers, timers, scripting elements and the debug sampler. */
export const writeLogicComponent: ComponentWriter = (documentNode, element, node, type) => {
  const p = propertySink(documentNode, element)
  switch (type) {
    case 'TransactionController':
      p.bool('TransactionController.parent', value(node, 'generateParent', false))
      p.bool('TransactionController.includeTimers', value(node, 'includeTimers', false))
      return true
    case 'IfController':
      p.str('IfController.condition', value(node, 'condition'))
      p.bool('IfController.useExpression', !value(node, 'interpretExpression', true))
      p.bool('IfController.evaluateAll', value(node, 'evaluateAll', false))
      return true
    case 'LoopController':
      p.bool('LoopController.continue_forever', value(node, 'forever', false))
      p.str('LoopController.loops', value(node, 'loops', 1))
      return true
    case 'WhileController':
      p.str('WhileController.condition', value(node, 'condition'))
      return true
    case 'ConstantTimer':
      p.str('ConstantTimer.delay', value(node, 'delay', 0))
      return true
    case 'DebugSampler':
      p.bool('displayJMeterProperties', value(node, 'displayJMeterProperties', false))
      p.bool('displayJMeterVariables', value(node, 'displayJMeterVariables', true))
      p.bool('displaySamplerProperties', value(node, 'displaySamplerProperties', false))
      p.bool('displaySystemProperties', value(node, 'displaySystemProperties', false))
      return true
    case 'JSR223Sampler':
    case 'JSR223PreProcessor':
    case 'JSR223PostProcessor':
    case 'JSR223Assertion':
      p.str('scriptLanguage', value(node, 'language', 'groovy'))
      p.str('parameters', value(node, 'parameters'))
      p.str('filename', value(node, 'scriptFile'))
      p.str('cacheKey', value(node, 'cache', true) ? 'true' : 'false')
      p.str('script', value(node, 'script'))
      return true
    case 'ModuleController':
      writeModuleControllerPath(documentNode, element, node)
      return true
    case 'TestFragmentController':
      // TestFragmentController is just a container, no special properties needed
      return true
    case 'BeanShellPostProcessor':
      p.str('script', value(node, 'script'))
      p.str('parameters', value(node, 'parameters'))
      p.str('filename', value(node, 'filename'))
      return true
    default:
      return false
  }
}
