import { readdirSync, statSync, cpSync, copyFileSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

const IGNORED_NAMES = new Set([
  'node_modules',
  '.git',
  '.gemini',
  '.openai',
  '.system_generated',
  '.tempmediaStorage',
  '.user_uploaded',
  'dist',
  'runs',
  'src',
  'server',
  'scripts',
  'tests',
  'apache-jmeter-5.6.3',
  'apache-jmeter-5.6.3.zip',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'tsconfig.app.tsbuildinfo',
  'tsconfig.node.tsbuildinfo',
  'vite.config.ts',
  'eslint.config.js',
  'index.html',
  'open-jmeter-web.bat',
  '.jmeter-web-port',
  'jmeter.log',
])

/** Copies workspace asset folders/files (data/, GPKD/, ...) into the run dir so FileServer.getBaseDir() resolves them. */
export function syncWorkspaceAssets(workspaceRoot: string, targetRunDir: string) {
  try {
    const entries = readdirSync(workspaceRoot)
    for (const name of entries) {
      if (IGNORED_NAMES.has(name) || name.startsWith('.')) continue
      const srcPath = join(workspaceRoot, name)
      const destPath = join(targetRunDir, name)

      try {
        const stat = statSync(srcPath)
        if (stat.isDirectory()) {
          if (name === 'downloads') {
            try {
              symlinkSync(srcPath, destPath, process.platform === 'win32' ? 'junction' : 'dir')
            } catch {
              cpSync(srcPath, destPath, { recursive: true, force: true })
            }
          } else {
            cpSync(srcPath, destPath, { recursive: true, force: true })
          }
        } else if (stat.isFile() && !name.endsWith('.jmx') && !name.endsWith('.ts') && !name.endsWith('.tsx')) {
          copyFileSync(srcPath, destPath)
        }
      } catch (err) {
        console.warn(`[JMeterRunner] Failed to sync asset ${name} to ${targetRunDir}:`, err)
      }
    }
  } catch (err) {
    console.warn('[JMeterRunner] Failed to read workspaceRoot for asset syncing:', err)
  }
}

function escapeXmlText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function workspacePath(workspaceRoot: string, ...segments: string[]): string {
  return join(workspaceRoot, ...segments).replace(/\\/g, '/')
}

function replaceArgumentValue(jmxContent: string, variableName: string, value: string): string {
  const escapedValue = escapeXmlText(value)
  const pattern = new RegExp(
    `(<elementProp\\b(?=[^>]*\\bname=(["'])${variableName}\\2)[^>]*>[\\s\\S]*?<stringProp\\b(?=[^>]*\\bname=(["'])Argument\\.value\\3)[^>]*>)([\\s\\S]*?)(<\\/stringProp>)`,
    'gi',
  )

  return jmxContent.replace(
    pattern,
    (_match, prefix: string, _q1: string, _q2: string, _current: string, suffix: string) => `${prefix}${escapedValue}${suffix}`,
  )
}

function normalizeLegacyWorkspaceRoots(jmxContent: string, workspaceRoot: string): string {
  const escapedWorkspaceRoot = escapeXmlText(workspacePath(workspaceRoot))
  return jmxContent
    .replace(/[A-Z]:[\\/]Project_Jmeter(?=[\\/]|<|&quot;|$)/gi, escapedWorkspaceRoot)
    .replace(/[A-Z]:[\\/]Jmeter(?=[\\/]|<|&quot;|$)/gi, escapedWorkspaceRoot)
}

export function normalizeWorkspaceAssetPaths(jmxContent: string, workspaceRoot: string): string {
  const projectRoot = workspacePath(workspaceRoot)
  const downloadDir = workspacePath(workspaceRoot, 'downloads')
  const dataDir = workspacePath(workspaceRoot, 'data')
  const dataDirWithSlash = `${dataDir}/`

  let normalized = normalizeLegacyWorkspaceRoots(jmxContent, workspaceRoot)

  normalized = replaceArgumentValue(normalized, 'downloadDir', downloadDir)
  normalized = replaceArgumentValue(normalized, 'folderdata', dataDir)
  normalized = replaceArgumentValue(normalized, 'datafolder', dataDirWithSlash)
  normalized = replaceArgumentValue(normalized, 'folderGPKD', projectRoot)

  const escapedDownloadDir = escapeXmlText(downloadDir)
  normalized = normalized.replace(
    /(<stringProp\b(?=[^>]*\bname=(["'])File\.path\2)[^>]*>)\s*downloads[\\/]+([\s\S]*?<\/stringProp>)/gi,
    (_match, prefix: string, _quote: string, rest: string) => `${prefix}${escapedDownloadDir}/${rest}`,
  )

  return normalized
}
