import { existsSync, readdirSync, statSync, unlinkSync, createWriteStream } from 'node:fs'
import { join } from 'node:path'
import { get as httpGet } from 'node:http'
import { get as httpsGet } from 'node:https'

export interface InstalledJar {
  name: string
  path: string
  size: number
  isExt: boolean
}

/** Lists every jar in lib/ext plus plugin-named jars in lib of a JMeter home. */
export function scanInstalledJars(jmeterHome: string | null): InstalledJar[] {
  if (!jmeterHome || !existsSync(jmeterHome)) return []

  const jars: InstalledJar[] = []

  const extDir = join(jmeterHome, 'lib', 'ext')
  if (existsSync(extDir)) {
    try {
      const files = readdirSync(extDir)
      for (const file of files) {
        if (file.endsWith('.jar')) {
          const filePath = join(extDir, file)
          const st = statSync(filePath)
          jars.push({ name: file, path: filePath, size: st.size, isExt: true })
        }
      }
    } catch {
      // ignore
    }
  }

  const libDir = join(jmeterHome, 'lib')
  if (existsSync(libDir)) {
    try {
      const files = readdirSync(libDir)
      for (const file of files) {
        if (file.endsWith('.jar') && file.toLowerCase().includes('plugin')) {
          const filePath = join(libDir, file)
          const st = statSync(filePath)
          jars.push({ name: file, path: filePath, size: st.size, isExt: false })
        }
      }
    } catch {
      // ignore
    }
  }

  return jars
}

/** Downloads `url` to `destPath`, following redirects; removes partial file on failure; 30s timeout. */
export function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const getter = url.startsWith('https') ? httpsGet : httpGet

    const request = getter(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download plugin: HTTP ${response.statusCode}`))
        return
      }

      const fileStream = createWriteStream(destPath)
      response.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close(() => resolve())
      })

      fileStream.on('error', (err) => {
        unlinkSync(destPath)
        reject(err)
      })
    })

    request.on('error', (err) => {
      if (existsSync(destPath)) unlinkSync(destPath)
      reject(err)
    })

    request.setTimeout(30000, () => {
      request.destroy()
      if (existsSync(destPath)) unlinkSync(destPath)
      reject(new Error('Download timed out.'))
    })
  })
}
