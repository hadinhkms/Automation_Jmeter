import type { TableRow, TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'
import type { CorrelationCandidate } from '../../models/correlation'

/**
 * Injects extractors and replaces parameter references inside a TestPlanNode hierarchy
 */
export function applyCorrelationsToTree(
  rootNode: TestPlanNode,
  correlations: CorrelationCandidate[],
): TestPlanNode {
  const activeCorrs = correlations.filter((c) => c.enabled)
  if (activeCorrs.length === 0) return rootNode

  const clone: TestPlanNode = JSON.parse(JSON.stringify(rootNode))

  // Map of replacements by original value
  const replacementsByVal = new Map<string, string>()
  activeCorrs.forEach((c) => {
    replacementsByVal.set(c.sampleValue, `\${${c.variableName}}`)
    c.targets.forEach((t) => {
      replacementsByVal.set(t.originalValue, `\${${c.variableName}}`)
    })
  })

  function replaceInString(str: string): string {
    if (!str) return str
    let res = str
    replacementsByVal.forEach((replacement, orig) => {
      if (orig && res.includes(orig)) {
        res = res.replaceAll(orig, replacement)
      }
    })
    return res
  }

  function traverseAndPatch(node: TestPlanNode) {
    // 1. If this node is a source request, attach the Extractor child
    const matchingSources = activeCorrs.filter((c) => {
      const nodeName = node.name.toLowerCase()
      const srcUrl = c.sourceRequestName.toLowerCase()
      return nodeName.includes(srcUrl.slice(-30)) || node.id === c.sourceRequestId
    })

    for (const src of matchingSources) {
      if (src.extractorType === 'JSONExtractor' && src.jsonPath) {
        const extractorNode = createNode('JSONExtractor', `${src.variableName} Extractor`, {
          variableNames: src.variableName,
          jsonPathExprs: src.jsonPath,
          matchNumbers: '1',
          defaultValues: 'NOT_FOUND',
        })
        node.children.push(extractorNode)
      } else if (src.regex) {
        const regexNode = createNode('RegexExtractor', `${src.variableName} Extractor`, {
          refName: src.variableName,
          regex: src.regex,
          template: '$1$',
          matchNumber: '1',
          defaultVal: 'NOT_FOUND',
        })
        node.children.push(regexNode)
      }
    }

    // 2. Perform parameter replacement in properties
    if (node.properties) {
      if (typeof node.properties.path === 'string') {
        node.properties.path = replaceInString(node.properties.path)
      }
      if (typeof node.properties.postBody === 'string') {
        node.properties.postBody = replaceInString(node.properties.postBody)
      }
      if (typeof node.properties.rawBody === 'string') {
        node.properties.rawBody = replaceInString(node.properties.rawBody)
      }

      if (Array.isArray(node.properties.parameters)) {
        // SAFETY: Array.isArray checked; editors always store these table rows as TableRow objects
        node.properties.parameters = (node.properties.parameters as TableRow[]).map((param) => ({
          ...param,
          value: replaceInString(String(param.value ?? '')),
        }))
      }

      if (Array.isArray(node.properties.headers)) {
        // SAFETY: Array.isArray checked; editors always store these table rows as TableRow objects
        node.properties.headers = (node.properties.headers as TableRow[]).map((header) => ({
          ...header,
          value: replaceInString(String(header.value ?? '')),
        }))
      }
    }

    node.children.forEach(traverseAndPatch)
  }

  traverseAndPatch(clone)
  return clone
}
