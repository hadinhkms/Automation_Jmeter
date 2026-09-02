export interface UploadedAsset {
  success: boolean
  fileName: string
  relativePath: string
  size: number
}

export interface ProjectAsset {
  fileName: string
  relativePath: string
  size: number
  updatedAt: number
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export const projectAssetService = {
  async listAssets(): Promise<ProjectAsset[]> {
    const res = await fetch('/api/jmeter/assets')
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    const payload = await res.json()
    return Array.isArray(payload.assets) ? payload.assets : []
  },

  async uploadAsset(file: File, targetDir = 'data'): Promise<UploadedAsset> {
    const contentBase64 = arrayBufferToBase64(await file.arrayBuffer())
    const res = await fetch('/api/jmeter/assets/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentBase64,
        targetDir,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    return await res.json()
  },

  async deleteAsset(relativePath: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/jmeter/assets/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relativePath }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    return await res.json()
  },
}
