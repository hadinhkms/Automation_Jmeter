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

export const jmxDiffService = {
  async getDiff(
    branchA: string,
    branchB: string,
    file = 'plans/test.jmx',
  ): Promise<JmxDiffResult> {
    const params = new URLSearchParams({
      branchA,
      branchB,
      file,
    })
    const res = await fetch(`/api/jmeter/jmx/diff?${params.toString()}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || `Failed to compare JMX: ${res.statusText}`)
    }
    return res.json()
  },
}
