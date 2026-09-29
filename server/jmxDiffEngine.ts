import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface JmxDiffField {
  key: string
  before: string
  after: string
}

export interface JmxDiffNode {
  id: string
  name: string
  type: string
  path: string
  fields?: JmxDiffField[]
}

export interface JmxDiffResult {
  branchA: string
  branchB: string
  file: string
  added: JmxDiffNode[]
  removed: JmxDiffNode[]
  changed: JmxDiffNode[]
  unchangedCount: number
  error?: string
}

interface ParsedJmxItem {
  key: string
  name: string
  type: string
  path: string
  props: Record<string, string>
}

function parseJmxToItems(xmlContent: string): ParsedJmxItem[] {
  const items: ParsedJmxItem[] = []
  if (!xmlContent || !xmlContent.trim()) return items

  // Tag regex to locate elements with testname and guiclass/testclass
  const elementRegex = /<([a-zA-Z0-9_]+)\s+([^>]*testname="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g
  let match: RegExpExecArray | null

  while ((match = elementRegex.exec(xmlContent)) !== null) {
    const rawTag = match[1]
    const attrs = match[2]
    const name = match[3]
    const inner = match[4]

    // Determine readable type
    let type = rawTag
    const classMatch = attrs.match(/testclass="([^"]+)"/)
    if (classMatch && classMatch[1]) {
      type = classMatch[1]
    }

    // Extract basic properties: stringProp, intProp, boolProp, longProp
    const props: Record<string, string> = {}
    const propRegex = /<(?:stringProp|boolProp|intProp|longProp)\s+name="([^"]+)">([\s\S]*?)<\/[a-zA-Z0-9_]+>/g
    let propMatch: RegExpExecArray | null
    while ((propMatch = propRegex.exec(inner)) !== null) {
      props[propMatch[1]] = propMatch[2].trim()
    }

    const key = `${type}::${name}`
    items.push({
      key,
      name,
      type,
      path: name,
      props,
    })
  }

  return items
}

function getFileContentFromGit(ref: string, relativePath: string): string {
  try {
    if (ref === 'WORKING_TREE') {
      const fullPath = join(process.cwd(), relativePath)
      if (existsSync(fullPath)) {
        return readFileSync(fullPath, 'utf-8')
      }
      return ''
    }
    const cleanRef = ref.replace(/[^a-zA-Z0-9_\-./]/g, '')
    const cleanPath = relativePath.replace(/\\/g, '/').replace(/[^a-zA-Z0-9_\-./]/g, '')
    return execSync(`git show "${cleanRef}:${cleanPath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000,
    })
  } catch {
    return ''
  }
}

export function computeJmxDiff(branchA: string, branchB: string, filePath: string): JmxDiffResult {
  const file = filePath.replace(/\\/g, '/') || 'plans/test.jmx'

  const contentA = getFileContentFromGit(branchA, file)
  const contentB = getFileContentFromGit(branchB, file)

  if (!contentA && !contentB) {
    return {
      branchA,
      branchB,
      file,
      added: [],
      removed: [],
      changed: [],
      unchangedCount: 0,
      error: `Could not read JMX file "${file}" from either ${branchA} or ${branchB}`,
    }
  }

  const itemsA = parseJmxToItems(contentA)
  const itemsB = parseJmxToItems(contentB)

  const mapA = new Map<string, ParsedJmxItem>()
  for (const item of itemsA) mapA.set(item.key, item)

  const mapB = new Map<string, ParsedJmxItem>()
  for (const item of itemsB) mapB.set(item.key, item)

  const added: JmxDiffNode[] = []
  const removed: JmxDiffNode[] = []
  const changed: JmxDiffNode[] = []
  let unchangedCount = 0

  for (const [key, itemB] of mapB.entries()) {
    const itemA = mapA.get(key)
    if (!itemA) {
      added.push({
        id: `add_${key}`,
        name: itemB.name,
        type: itemB.type,
        path: itemB.path,
      })
    } else {
      // Compare properties
      const allKeys = new Set([...Object.keys(itemA.props), ...Object.keys(itemB.props)])
      const fields: JmxDiffField[] = []

      for (const k of allKeys) {
        const valA = itemA.props[k] ?? '(none)'
        const valB = itemB.props[k] ?? '(none)'
        if (valA !== valB) {
          fields.push({ key: k, before: valA, after: valB })
        }
      }

      if (fields.length > 0) {
        changed.push({
          id: `chg_${key}`,
          name: itemB.name,
          type: itemB.type,
          path: itemB.path,
          fields,
        })
      } else {
        unchangedCount++
      }
    }
  }

  for (const [key, itemA] of mapA.entries()) {
    if (!mapB.has(key)) {
      removed.push({
        id: `rem_${key}`,
        name: itemA.name,
        type: itemA.type,
        path: itemA.path,
      })
    }
  }

  return {
    branchA,
    branchB,
    file,
    added,
    removed,
    changed,
    unchangedCount,
  }
}
