import type { TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'
import type { FlatPostmanItem, PostmanCollection, PostmanItem } from './postmanTypes'
import {
  type ConvertRequestOptions,
  convertPostmanRequestToNode,
} from './postmanRequestConverter'

export function parsePostmanCollection(jsonString: string): {
  collection: PostmanCollection | null
  error?: string
  version?: 'v2.0' | 'v2.1' | 'unknown'
} {
  try {
    const parsed = JSON.parse(jsonString) as PostmanCollection
    if (!parsed || typeof parsed !== 'object' || !parsed.info || !Array.isArray(parsed.item)) {
      return { collection: null, error: 'JSON does not match Postman Collection format.' }
    }

    const schema = parsed.info.schema || ''
    let version: 'v2.0' | 'v2.1' | 'unknown' = 'unknown'
    if (schema.includes('v2.1.0')) version = 'v2.1'
    else if (schema.includes('v2.0.0')) version = 'v2.0'

    return { collection: parsed, version }
  } catch (err) {
    return { collection: null, error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export function extractFlatItems(
  items: PostmanItem[],
  parentPath = '',
  idPrefix = 'pm',
): FlatPostmanItem[] {
  const result: FlatPostmanItem[] = []

  items.forEach((it, idx) => {
    const id = `${idPrefix}_${idx}`
    const path = parentPath ? `${parentPath} / ${it.name}` : it.name
    const isFolder = Array.isArray(it.item) && it.item.length > 0

    let method = ''
    let url = ''
    if (it.request) {
      method = it.request.method || 'GET'
      url = typeof it.request.url === 'string' ? it.request.url : it.request.url?.raw || ''
    }

    result.push({
      id,
      name: it.name,
      path,
      isFolder,
      method,
      url,
      rawItem: it,
    })

    if (isFolder && it.item) {
      const children = extractFlatItems(it.item, path, id)
      result.push(...children)
    }
  })

  return result
}

export function convertCollectionToNodes(
  items: PostmanItem[],
  selectedIds: Set<string>,
  options: ConvertRequestOptions,
  idPrefix = 'pm',
): TestPlanNode[] {
  const nodes: TestPlanNode[] = []

  items.forEach((it, idx) => {
    const id = `${idPrefix}_${idx}`
    if (it.request && selectedIds.has(id)) {
      nodes.push(convertPostmanRequestToNode(it, options))
    } else if (it.item && Array.isArray(it.item)) {
      // Folder -> TransactionController
      const childNodes = convertCollectionToNodes(it.item, selectedIds, options, id)
      if (childNodes.length > 0) {
        nodes.push(
          createNode('TransactionController', it.name, { generateParent: false }, childNodes),
        )
      }
    }
  })

  return nodes
}
