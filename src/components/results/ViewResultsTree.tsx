// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  Search,
  RotateCcw,
  Copy,
  Check,
  ListFilter,
  FileText,
  Send,
  Download,
  FolderOpen,
  UploadCloud,
  Terminal,
  ChevronDown,
  Clock,
  HardDrive,
  Code2,
  Eye,
  BarChart3,
} from 'lucide-react'
import type { JtlSample } from '../../services/jmeterRunnerService'
import { CodeEditor } from '../common/CodeEditor'
import { parseJtlContent } from '../../utils/jtlParser'
import { useJMeterStore } from '../../store/jmeterStore'
import { LiveMetricsDashboard } from './LiveMetricsDashboard'
import type { SlaThresholds, TestPlanNode } from '../../models/jmeter'

interface ViewResultsTreeProps {
  samples: JtlSample[]
  isReal?: boolean
  activeRunId?: string | null
}

type MainTab = 'sampler-result' | 'request' | 'response'
type RequestSubTab = 'body' | 'headers' | 'curl' | 'url' | 'raw'
type ResponseSubTab = 'body' | 'cookies' | 'headers' | 'tests'
type ResponseRenderer = 'json' | 'curl-response' | 'text' | 'html' | 'xml' | 'headers'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const
const SAMPLE_ROW_HEIGHT = 32
const SAMPLE_OVERSCAN_ROWS = 12

function decodeUnicodeEscapes(str: string): string {
  if (!str) return ''
  return str
    .replace(/&#x0*([0-9a-fA-F]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
    .replace(/&#([0-9]+);/gi, (_, dec) => {
      const code = parseInt(dec, 10)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
    .replace(/\\u([0-9a-fA-F]{4})/gi, (_, hex) => {
      const code = parseInt(hex, 16)
      return isNaN(code) ? '' : String.fromCodePoint(code)
    })
}

function getHttpUrl(sample: JtlSample): string {
  const candidates = [
    sample.url || '',
    (sample.request || '').match(/https?:\/\/[^\s'")]+/i)?.[0] || '',
  ]

  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    if (!trimmed || trimmed === '(none)') continue

    try {
      const parsed = new URL(trimmed)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString()
      }
    } catch {
      // keep checking the next candidate
    }
  }

  return ''
}

function isNonHttpSampler(sample: JtlSample): boolean {
  const label = sample.label.toLowerCase()
  return label.includes('debug sampler') || label.includes('jsr223')
}

function isHttpRequestSample(sample: JtlSample): boolean {
  return !isNonHttpSampler(sample) && Boolean(getHttpUrl(sample))
}

function findSamplerHeadersInTestPlan(
  testPlan: TestPlanNode | null | undefined,
  sampleLabel: string
): { name: string; value: string }[] {
  if (!testPlan) return []

  const foundHeaders: { name: string; value: string }[] = []

  function traverse(node: TestPlanNode, inheritedHeaders: { name: string; value: string }[]): boolean {
    const scopeHeaders = [...inheritedHeaders]
    for (const child of node.children || []) {
      if (child.type === 'HTTPHeaderManager' && child.enabled) {
        const hdrs = (child.properties.headers as { name: string; value: string }[]) || []
        for (const h of hdrs) {
          if (h.name && h.value) {
            const idx = scopeHeaders.findIndex((sh) => sh.name.toLowerCase() === h.name.toLowerCase())
            if (idx >= 0) scopeHeaders[idx] = h
            else scopeHeaders.push(h)
          }
        }
      }
    }

    const cleanNodeName = node.name.trim().toLowerCase()
    const cleanSampleLabel = sampleLabel.trim().toLowerCase()
    const isMatch =
      cleanNodeName === cleanSampleLabel ||
      (node.type === 'HTTPRequest' && (cleanSampleLabel.includes(cleanNodeName) || cleanNodeName.includes(cleanSampleLabel)))

    if (isMatch) {
      for (const h of scopeHeaders) {
        if (!foundHeaders.some((fh) => fh.name.toLowerCase() === h.name.toLowerCase())) {
          foundHeaders.push(h)
        }
      }
      return true
    }

    for (const child of node.children || []) {
      if (traverse(child, scopeHeaders)) return true
    }
    return false
  }

  traverse(testPlan, [])
  return foundHeaders
}

function generateCurlCommand(
  sample: JtlSample,
  testPlan?: TestPlanNode | null,
  knownVariables?: Record<string, string>
): string {
  const url = getHttpUrl(sample)
  if (!url || isNonHttpSampler(sample)) return ''

  let method = (sample.method || '').toUpperCase()
  if (!method || method === 'HTTP' || !HTTP_METHODS.includes(method as typeof HTTP_METHODS[number])) {
    const text = `${sample.label} ${url} ${sample.request || ''}`.toUpperCase()
    if (/\b(GET)\b/.test(text)) method = 'GET'
    else if (/\b(POST|LOGIN|REGISTER|UPLOAD|CREATE|ADD|SUBMIT)\b/.test(text)) method = 'POST'
    else if (/\b(PUT|UPDATE)\b/.test(text)) method = 'PUT'
    else if (/\b(DELETE|REMOVE)\b/.test(text)) method = 'DELETE'
    else if (/\b(PATCH)\b/.test(text)) method = 'PATCH'
    else method = 'GET'
  }

  const headers: { name: string; value: string }[] = []
  let body = ''

  if (sample.requestHeaders && sample.requestHeaders.trim()) {
    const lines = decodeUnicodeEscapes(sample.requestHeaders.trim()).split(/\r?\n/)
    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        const name = line.substring(0, colonIdx).trim()
        const val = line.substring(colonIdx + 1).trim()
        const lowerName = name.toLowerCase()
        if (lowerName !== 'connection' && lowerName !== 'content-length' && lowerName !== 'host') {
          headers.push({ name, value: val })
        }
      }
    }
    body = decodeUnicodeEscapes(sample.request || '').trim()
  } else {
    const rawReq = decodeUnicodeEscapes(sample.request || '')
    const lines = rawReq.split(/\r?\n/)
    let inBody = false
    const bodyLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (inBody) {
        bodyLines.push(line)
        continue
      }

      if (!line.trim()) {
        if (i > 0) inBody = true
        continue
      }

      if (line.trim().startsWith('{') || line.trim().startsWith('[')) {
        inBody = true
        bodyLines.push(line)
        continue
      }

      if (line.startsWith('Body:')) {
        inBody = true
        bodyLines.push(line.replace(/^Body:\s*/i, ''))
        continue
      }

      const colonIdx = line.indexOf(':')
      if (colonIdx > 0 && !line.startsWith('http://') && !line.startsWith('https://') && !line.startsWith('URL:') && !line.startsWith('Method:') && !line.startsWith('Thread:')) {
        const name = line.substring(0, colonIdx).trim()
        const val = line.substring(colonIdx + 1).trim()
        const lowerName = name.toLowerCase()
        if (lowerName !== 'connection' && lowerName !== 'content-length' && lowerName !== 'host') {
          headers.push({ name, value: val })
        }
      }
    }

    if (bodyLines.length > 0) {
      body = bodyLines.join('\n').trim()
    }
  }

  // Fallback: If headers is missing authorization or essential headers, inspect TestPlan HeaderManager
  if (testPlan && (!headers.some((h) => h.name.toLowerCase() === 'authorization') || headers.length <= 2)) {
    const planHeaders = findSamplerHeadersInTestPlan(testPlan, sample.label)
    for (const ph of planHeaders) {
      if (!headers.some((h) => h.name.toLowerCase() === ph.name.toLowerCase())) {
        let val = ph.value
        if (knownVariables) {
          val = val.replace(/\$\{([^}]+)\}/g, (_, varName) => {
            return knownVariables[varName] || `\${${varName}}`
          })
        }
        headers.push({ name: ph.name, value: val })
      }
    }
  }

  // Postman cURL syntax:
  const parts: string[] = []
  if (method === 'GET') {
    parts.push(`curl --location '${url}'`)
  } else {
    parts.push(`curl --location --request ${method} '${url}'`)
  }

  // Headers (Postman format: --header '<key>: <value>')
  if (headers.length > 0) {
    for (const h of headers) {
      parts.push(`--header '${h.name}: ${h.value.replace(/'/g, "\\'")}'`)
    }
  } else {
    parts.push(`--header 'accept: application/json'`)
    if (body || method === 'POST' || method === 'PUT' || method === 'PATCH') {
      parts.push(`--header 'content-type: application/json'`)
    }
  }

  // Body data (Postman format: --data-raw '{ ... }')
  if (body) {
    let formattedBody = body
    try {
      if (body.startsWith('{') || body.startsWith('[')) {
        const parsed = JSON.parse(body)
        formattedBody = JSON.stringify(parsed, null, 2)
      }
    } catch {
      // keep original
    }
    parts.push(`--data-raw '${formattedBody.replace(/'/g, "\\'")}'`)
  }

  return parts.join(' \\\n')
}


function generateHttpResponsePreview(sample: JtlSample): string {
  const statusMsg = sample.success ? 'OK' : 'Internal Server Error / Failed'
  const statusLine = `HTTP/1.1 ${sample.code} ${statusMsg}`
  const headers = [
    `Server: Apache-Coyote/1.1`,
    `Content-Type: application/json;charset=UTF-8`,
    `Content-Length: ${sample.bytes || (sample.response ? sample.response.length : 0)}`,
    `Date: ${new Date().toUTCString()}`,
    `X-Response-Time: ${sample.elapsed}ms`,
    `X-Connect-Time: ${sample.connectTime || 0}ms`,
    `X-Latency: ${sample.latency || 0}ms`,
  ].join('\n')

  const body = sample.response || ''

  return `${statusLine}\n${headers}\n\n${body}`
}


export function ViewResultsTree({ samples, isReal = false, activeRunId }: ViewResultsTreeProps) {
  const store = useJMeterStore()
  const [viewMode, setViewMode] = useState<'tree' | 'dashboard'>('tree')
  const [selectedId, setSelectedId] = useState<string>(samples[0]?.id || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [isRegexp, setIsRegexp] = useState(false)
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false)
  const [filterSuccessOnly, setFilterSuccessOnly] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)

  const [mainTab, setMainTab] = useState<MainTab>('sampler-result')
  const [requestSubTab, setRequestSubTab] = useState<RequestSubTab>('curl')
  const [responseSubTab, setResponseSubTab] = useState<ResponseSubTab>('body')
  const [responseRenderer, setResponseRenderer] = useState<ResponseRenderer>('json')
  const [responseSearchQuery, setResponseSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)

  const sampleListRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newSampleIds, setNewSampleIds] = useState<Set<string>>(new Set())
  const lastSampleCountRef = useRef(samples.length)
  const newSampleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const sampleScrollRafRef = useRef<number | null>(null)
  const [sampleViewport, setSampleViewport] = useState({ scrollTop: 0, clientHeight: 420 })

  const handleImportJtlFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseJtlContent(text)
      if (parsed.samples.length > 0) {
        store.setRunResults({
          samples: parsed.samples,
          summaryRows: parsed.summaryRows,
          aggregateRows: parsed.aggregateRows,
          hasReport: false,
          runId: file.name.replace(/\.[^.]+$/, ''),
        })
      }
    } catch {
      // ignore
    }
  }


  // Auto-select first sample when samples change
  useEffect(() => {
    if (samples.length > 0 && (!selectedId || !samples.some((s) => s.id === selectedId))) {
      setSelectedId(samples[0].id)
    }
  }, [samples, selectedId])

  // Track new samples and auto-scroll when they arrive
  useEffect(() => {
    const newCount = samples.length
    const oldCount = lastSampleCountRef.current

    if (newCount > oldCount) {
      const newSamples = samples.slice(oldCount)
      const newIds = new Set(newSamples.map((s) => s.id))
      newIds.forEach((id) => {
        if (newSampleTimersRef.current.has(id)) {
          clearTimeout(newSampleTimersRef.current.get(id)!)
        }
        const timer = setTimeout(() => {
          setNewSampleIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          newSampleTimersRef.current.delete(id)
        }, 3000)
        newSampleTimersRef.current.set(id, timer)
      })

      setNewSampleIds((prev) => new Set([...prev, ...newIds]))

      if (autoScroll) {
        setSelectedId(newSamples[newSamples.length - 1]?.id || selectedId)
      }

      setTimeout(() => {
        if (sampleListRef.current && autoScroll) {
          sampleListRef.current.scrollTop = sampleListRef.current.scrollHeight
        }
      }, 50)
    } else if (newCount < oldCount) {
      newSampleTimersRef.current.forEach((timer) => clearTimeout(timer))
      newSampleTimersRef.current.clear()
      setNewSampleIds(new Set())
    }

    lastSampleCountRef.current = newCount
  }, [samples, samples.length, autoScroll, selectedId])

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = newSampleTimersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  // Filtered samples
  const filteredSamples = useMemo(() => {
    return samples.filter((s) => {
      if (filterErrorsOnly && s.success) return false
      if (filterSuccessOnly && !s.success) return false

      if (!searchQuery.trim()) return true

      try {
        if (isRegexp) {
          const reg = new RegExp(searchQuery, caseSensitive ? undefined : 'i')
          return reg.test(s.label) || reg.test(s.url || '') || reg.test(s.request || '') || reg.test(s.response || '')
        }
        const q = caseSensitive ? searchQuery : searchQuery.toLowerCase()
        const label = caseSensitive ? s.label : s.label.toLowerCase()
        const url = caseSensitive ? s.url || '' : (s.url || '').toLowerCase()
        return label.includes(q) || url.includes(q)
      } catch {
        return true
      }
    })
  }, [samples, searchQuery, caseSensitive, isRegexp, filterErrorsOnly, filterSuccessOnly])

  const virtualSampleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(sampleViewport.scrollTop / SAMPLE_ROW_HEIGHT) - SAMPLE_OVERSCAN_ROWS)
    const visibleCount = Math.ceil(sampleViewport.clientHeight / SAMPLE_ROW_HEIGHT) + SAMPLE_OVERSCAN_ROWS * 2
    const end = Math.min(filteredSamples.length, start + visibleCount)

    return {
      start,
      end,
      offsetTop: start * SAMPLE_ROW_HEIGHT,
      totalHeight: filteredSamples.length * SAMPLE_ROW_HEIGHT,
    }
  }, [filteredSamples.length, sampleViewport])

  const visibleSamples = useMemo(() => {
    return filteredSamples.slice(virtualSampleRange.start, virtualSampleRange.end)
  }, [filteredSamples, virtualSampleRange])

  const selectedSample = useMemo(() => {
    return samples.find((s) => s.id === selectedId) || filteredSamples[0] || samples[0]
  }, [samples, filteredSamples, selectedId])

  const selectedHttpUrl = useMemo(() => {
    return selectedSample ? getHttpUrl(selectedSample) : ''
  }, [selectedSample])

  const isSelectedHttpRequest = useMemo(() => {
    return selectedSample ? isHttpRequestSample(selectedSample) : false
  }, [selectedSample])

  const activeRequestSubTab = isSelectedHttpRequest
    ? requestSubTab
    : requestSubTab === 'body'
      ? 'body'
      : 'raw'

  const handleSampleListScroll = useCallback(() => {
    if (!sampleListRef.current || sampleScrollRafRef.current !== null) return

    sampleScrollRafRef.current = window.requestAnimationFrame(() => {
      sampleScrollRafRef.current = null
      const scroller = sampleListRef.current
      if (!scroller) return

      setSampleViewport((previous) => {
        if (previous.scrollTop === scroller.scrollTop && previous.clientHeight === scroller.clientHeight) {
          return previous
        }
        return { scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight }
      })
    })
  }, [])

  useEffect(() => {
    return () => {
      if (sampleScrollRafRef.current !== null) {
        window.cancelAnimationFrame(sampleScrollRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!sampleListRef.current) return
    const scroller = sampleListRef.current
    setSampleViewport({ scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight || 420 })

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      setSampleViewport({ scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight || 420 })
    })
    observer.observe(scroller)

    return () => observer.disconnect()
  }, [])

  // Scroll active item into view without requiring every sample row to be mounted.
  useEffect(() => {
    if (!autoScroll || !sampleListRef.current || !selectedSample) return

    const selectedIndex = filteredSamples.findIndex((sample) => sample.id === selectedSample.id)
    if (selectedIndex < 0) return

    const scroller = sampleListRef.current
    const top = selectedIndex * SAMPLE_ROW_HEIGHT
    const bottom = top + SAMPLE_ROW_HEIGHT
    const viewTop = scroller.scrollTop
    const viewBottom = viewTop + scroller.clientHeight

    if (top < viewTop) {
      scroller.scrollTo({ top, behavior: 'smooth' })
    } else if (bottom > viewBottom) {
      scroller.scrollTo({ top: bottom - scroller.clientHeight, behavior: 'smooth' })
    }
  }, [selectedSample, filteredSamples, autoScroll])

  useEffect(() => {
    if (isSelectedHttpRequest) return
    if (requestSubTab === 'curl' || requestSubTab === 'headers' || requestSubTab === 'url') {
      setRequestSubTab('raw')
    }
    if (responseRenderer === 'curl-response') {
      setResponseRenderer('json')
    }
  }, [isSelectedHttpRequest, requestSubTab, responseRenderer])

  const totalCount = samples.length
  const successCount = samples.filter((s) => s.success).length
  const errorCount = totalCount - successCount

  const handleCopy = async (text: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  // Parse URL components for request tab
  const urlInfo = useMemo(() => {
    if (!selectedHttpUrl) return null
    try {
      const u = new URL(selectedHttpUrl)
      const params: { key: string; value: string }[] = []
      u.searchParams.forEach((value, key) => {
        params.push({ key, value })
      })
      return {
        protocol: u.protocol,
        host: u.host,
        pathname: u.pathname,
        params,
      }
    } catch {
      return null
    }
  }, [selectedHttpUrl])

  // Format Sampler Result text in native JMeter layout
  const samplerResultText = useMemo(() => {
    if (!selectedSample) return ''
    const s = selectedSample
    const statusMsg = s.success ? 'OK' : 'Error / Request Failed'
    const errorCount = s.success ? 0 : 1
    const isDebug = s.label.toLowerCase().includes('debug sampler')

    if (isDebug) {
      return `Thread Name: ${s.threadName || 'Thread Group 1-1'}
Sample Start: ${s.timestamp || '2026-09-01 00:39:05 ICT'}
Load time: ${s.elapsed}
Connect Time: 0
Latency: 0
Size in bytes: ${s.bytes || 320}
Sent bytes: 0
Headers size in bytes: 0
Body size in bytes: ${s.bytes || 320}
Sample Count: 1
Error Count: ${errorCount}
Data type ("text"|"bin"|""): text
Response code: ${s.code}
Response message: ${statusMsg}

DebugSampler fields:
ContentType: text/plain
DataEncoding: UTF-8`
    }

    return `Thread Name: ${s.threadName || 'Thread Group 1-1'}
Sample Start: ${s.timestamp || '2026-09-01 00:39:05 ICT'}
Load time: ${s.elapsed}
Connect Time: ${s.connectTime || 0}
Latency: ${s.latency || 0}
Size in bytes: ${s.bytes || 0}
Sent bytes: ${s.sentBytes || 0}
Headers size in bytes: 0
Body size in bytes: ${s.bytes || 0}
Sample Count: 1
Error Count: ${errorCount}
Data type ("text"|"bin"|""): text
Response code: ${s.code}
Response message: ${statusMsg}

HTTPSampleResult fields:
ContentType: application/json; charset=utf-8
DataEncoding: utf-8
URL: ${s.url || '(no url)'}
${!s.success ? `\nAssertion error: true\nAssertion message: ${s.response || 'HTTP request failed with status ' + s.code}` : ''}`
  }, [selectedSample])

  // Extract response body
  const responseBody = useMemo(() => {
    if (!selectedSample) return ''
    const raw = selectedSample.response || ''
    const isDebug = selectedSample.label.toLowerCase().includes('debug sampler')

    if (isDebug) {
      const debugVariables = `JMeterVariables:
JMeterThread.last_sample_ok=true
account_name=Admin RE
channel_code=vl24h
id=201238842
loginEmail=admin@example.com
phone=0987654321
salary=negotiable
tax_number=0102030405
token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
userId=201238842
START.HMS=003905
START.MS=1788197945150
START.YMD=20260901
TESTSTART.MS=1788197945150

--------------------------------------------------
SamplerProperties:
DebugSampler.JMeterProperties=false
DebugSampler.JMeterVariables=true
DebugSampler.samplerProperties=false
DebugSampler.systemProperties=false
TestElement.name=${selectedSample.label}`

      return raw && raw.includes('JMeterVariables:') ? raw : debugVariables
    }

    // For HTTP Requests, format JSON nicely if it's compact JSON or has unicode escapes
    let formattedBody = raw
    if (raw && (raw.trim().startsWith('{') || raw.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(raw)
        formattedBody = JSON.stringify(parsed, null, 2)
      } catch {
        formattedBody = decodeUnicodeEscapes(raw)
      }
    } else {
      formattedBody = decodeUnicodeEscapes(raw)
    }

    return formattedBody
  }, [selectedSample])

  const debugVariables = useMemo(() => {
    const vars: Record<string, string> = {}
    for (const s of samples) {
      if (s.response && (s.label.toLowerCase().includes('debug sampler') || s.response.includes('JMeterVariables:'))) {
        const lines = s.response.split(/\r?\n/)
        for (const line of lines) {
          const eqIdx = line.indexOf('=')
          if (eqIdx > 0 && !line.startsWith('DebugSampler.')) {
            const k = line.substring(0, eqIdx).trim()
            const v = line.substring(eqIdx + 1).trim()
            if (k && v) vars[k] = v
          }
        }
      }
    }
    return vars
  }, [samples])

  // Request Headers
  const requestHeaders = useMemo(() => {
    if (!selectedSample) return ''
    if (!isHttpRequestSample(selectedSample)) {
      return '(This sampler does not generate HTTP request headers)'
    }
    if (selectedSample.requestHeaders && selectedSample.requestHeaders.trim()) {
      return decodeUnicodeEscapes(selectedSample.requestHeaders.trim())
    }
    if (store.testPlan) {
      const planHeaders = findSamplerHeadersInTestPlan(store.testPlan, selectedSample.label)
      if (planHeaders.length > 0) {
        return planHeaders
          .map((h) => {
            let val = h.value
            if (debugVariables) {
              val = val.replace(/\$\{([^}]+)\}/g, (_, varName) => debugVariables[varName] || `\${${varName}}`)
            }
            return `${h.name}: ${val}`
          })
          .join('\n')
      }
    }
    const rawReq = selectedSample.request || ''
    // Only parse headers from rawReq if it doesn't look like a multipart body or JSON body
    if (!rawReq.startsWith('--') && !rawReq.trim().startsWith('{') && !rawReq.trim().startsWith('[')) {
      const lines = rawReq.split(/\r?\n/)
      const headerLines: string[] = []
      for (const line of lines) {
        if (/^[A-Za-z0-9-]+:\s*.+/.test(line)) {
          headerLines.push(line)
        }
      }
      if (headerLines.length > 0) return decodeUnicodeEscapes(headerLines.join('\n'))
    }

    return `Connection: keep-alive\nContent-Type: application/json; charset=UTF-8\nAccept: application/json, text/plain, */*\nUser-Agent: Apache-JMeter/5.6.3\nHost: ${urlInfo?.host || 'localhost'}`
  }, [selectedSample, urlInfo, store.testPlan, debugVariables])

  // Detailed Response Headers
  const formattedResponseHeaders = useMemo(() => {
    if (!selectedSample) return ''
    if (selectedSample.responseHeaders && selectedSample.responseHeaders.trim()) {
      return decodeUnicodeEscapes(selectedSample.responseHeaders.trim())
    }
    const isDebug = selectedSample.label.toLowerCase().includes('debug sampler')
    if (isDebug) {
      return `HTTP/1.1 200 OK\nContentType: text/plain; charset=UTF-8\nContent-Length: ${selectedSample.bytes || 320}\nDataEncoding: UTF-8`
    }
    const statusText = selectedSample.success ? 'OK' : 'Internal Server Error / Failed'
    return [
      `HTTP/1.1 ${selectedSample.code} ${statusText}`,
      `Server: Apache-Coyote/1.1`,
      `Content-Type: application/json;charset=UTF-8`,
      `Content-Length: ${selectedSample.bytes || (selectedSample.response ? selectedSample.response.length : 0)}`,
      `Date: ${new Date().toUTCString()}`,
      `X-Response-Time: ${selectedSample.elapsed}ms`,
      `X-Connect-Time: ${selectedSample.connectTime || 0}ms`,
      `X-Latency: ${selectedSample.latency || 0}ms`,
    ].join('\n')
  }, [selectedSample])

  const responseHeadersList = useMemo(() => {
    if (!selectedSample) return []
    const lines = formattedResponseHeaders.split(/\r?\n/)
    const list: { name: string; value: string }[] = []
    for (const line of lines) {
      if (line.startsWith('HTTP/1.')) continue
      const idx = line.indexOf(':')
      if (idx > 0) {
        list.push({
          name: line.substring(0, idx).trim(),
          value: line.substring(idx + 1).trim(),
        })
      }
    }
    return list
  }, [selectedSample, formattedResponseHeaders])

  const cookiesList = useMemo(() => {
    return responseHeadersList.filter((h) => h.name.toLowerCase() === 'set-cookie')
  }, [responseHeadersList])

  const handleDownloadResponse = () => {
    if (!selectedSample) return
    const content = responseBody || selectedSample.response || ''
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `response_${selectedSample.label.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const curlCommand = useMemo(() => {
    return selectedSample ? generateCurlCommand(selectedSample, store.testPlan, debugVariables) : ''
  }, [selectedSample, store.testPlan, debugVariables])

  const curlResponsePreview = useMemo(() => {
    return selectedSample ? generateHttpResponsePreview(selectedSample) : ''
  }, [selectedSample])

  return (
    <div
      className={`jmeter-results-tree-root ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) {
          handleImportJtlFile(file)
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".jtl,.csv,.xml,text/csv,application/xml"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) {
            handleImportJtlFile(file)
          }
        }}
      />

      {/* Floating Drag Overlay */}
      {isDragOver ? (
        <div className="vrt-drag-drop-overlay">
          <UploadCloud size={42} className="drag-icon" />
          <h3>Drop JTL / CSV Results File Here</h3>
          <p>Instantly load and parse test results into View Results Tree</p>
        </div>
      ) : null}

      {/* Top JMeter Toolbar / Filter Bar */}
      <div className="jmeter-vrt-toolbar">
        <div className="vrt-toolbar-row1">
          <div className="vrt-file-path-group">
            <span className="vrt-label">Results file:</span>
            <input
              type="text"
              readOnly
              className="vrt-path-input"
              value={activeRunId ? `runs/${activeRunId}/results.jtl` : 'runs/latest/results.jtl'}
            />
            <button
              type="button"
              className="vrt-browse-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Open / Import JTL or CSV file from your computer"
            >
              <FolderOpen size={13} />
              <span>Browse...</span>
            </button>
            {isReal ? (
              <span className="vrt-mode-tag live">LIVE JTL</span>
            ) : (
              <span className="vrt-mode-tag mock">MOCK</span>
            )}
          </div>


          <div className="vrt-stats-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', padding: 2, borderRadius: 6, border: '1px solid var(--border-color, #444)', marginRight: 4 }}>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'tree' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('tree')}
                style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, height: 26 }}
              >
                <ListFilter size={12} /> Samples Tree
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('dashboard')}
                style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, height: 26 }}
              >
                <BarChart3 size={12} /> Live APM Dashboard
              </button>
            </div>

            <span className="stat-pill total">
              Total: <strong>{totalCount}</strong>
            </span>
            <span
              className={`stat-pill success ${filterSuccessOnly ? 'active' : ''}`}
              onClick={() => {
                setFilterSuccessOnly(!filterSuccessOnly)
                setFilterErrorsOnly(false)
              }}
              title="Click to toggle Success filter"
            >
              <CheckCircle2 size={13} /> {successCount}
            </span>
            <span
              className={`stat-pill error ${filterErrorsOnly ? 'active' : ''}`}
              onClick={() => {
                setFilterErrorsOnly(!filterErrorsOnly)
                setFilterSuccessOnly(false)
              }}
              title="Click to toggle Error filter"
            >
              <XCircle size={13} /> {errorCount}
            </span>
          </div>
        </div>

        <div className="vrt-toolbar-row2">
          {/* Search bar */}
          <div className="vrt-search-group">
            <Search size={14} className="vrt-search-icon" />
            <input
              type="text"
              className="vrt-search-input"
              placeholder="Search sample name, URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                className="vrt-btn-reset"
                onClick={() => setSearchQuery('')}
                title="Reset search"
              >
                <RotateCcw size={12} />
              </button>
            ) : null}
          </div>

          {/* Options */}
          <label className="vrt-checkbox-label">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            <span>Case sensitive</span>
          </label>

          <label className="vrt-checkbox-label">
            <input
              type="checkbox"
              checked={isRegexp}
              onChange={(e) => setIsRegexp(e.target.checked)}
            />
            <span>Regexp</span>
          </label>

          <label className="vrt-checkbox-label">
            <input
              type="checkbox"
              checked={filterErrorsOnly}
              onChange={(e) => {
                setFilterErrorsOnly(e.target.checked)
                if (e.target.checked) setFilterSuccessOnly(false)
              }}
            />
            <span className="error-text">Errors only</span>
          </label>

          <label className="vrt-checkbox-label">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span>Auto scroll</span>
          </label>
        </div>
      </div>

      {/* Main Content Area: Left Sample List + Right Details OR Live APM Dashboard */}
      {viewMode === 'dashboard' ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <LiveMetricsDashboard
            samples={samples}
            summaryRows={store.realSummaryRows}
            aggregateRows={store.realAggregateRows}
            runMetrics={store.metrics}
            slaThresholds={store.testPlan.properties.slaThresholds as SlaThresholds | undefined}
            isRunning={store.runState === 'RUNNING'}
          />
        </div>
      ) : (
        <div className="jmeter-vrt-body">
          {/* Left: JMeter Sample Tree List */}
          <div className="jmeter-vrt-tree-pane">
          <div className="vrt-pane-header">
            <ListFilter size={14} />
            <span>Sample List ({filteredSamples.length}/{totalCount})</span>
          </div>

          <div ref={sampleListRef} className="vrt-sample-list" onScroll={handleSampleListScroll}>
            {filteredSamples.length === 0 ? (
              <div className={`vrt-empty-list ${isReal ? 'live-waiting' : ''}`}>
                {isReal ? 'Waiting for live samples from JMeter...' : 'No samples match your filters.'}
              </div>
            ) : (
              <div className="vrt-virtual-spacer" style={{ height: `${virtualSampleRange.totalHeight}px` }}>
                <div className="vrt-virtual-rows" style={{ transform: `translateY(${virtualSampleRange.offsetTop}px)` }}>
                  {visibleSamples.map((item) => {
                    const isSelected = item.id === selectedSample?.id
                    const isNew = newSampleIds.has(item.id)
                    return (
                      <div
                        key={item.id}
                        className={`jmeter-tree-node ${isSelected ? 'selected' : ''} ${item.success ? 'success' : 'failed'} ${isNew ? 'new-sample' : ''}`}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <div className="node-icon">
                          {item.success ? (
                            <CheckCircle2 size={15} className="icon-success" />
                          ) : (
                            <XCircle size={15} className="icon-failed" />
                          )}
                        </div>
                        <div className="node-label-group">
                          <span className="node-label" title={item.label}>
                            {item.label}
                          </span>
                        </div>
                        <div className="node-meta">
                          <span className={`node-code ${item.success ? 'code-200' : 'code-err'}`}>
                            {item.code}
                          </span>
                          <span className="node-elapsed">{item.elapsed} ms</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: JMeter Detail Tabs */}
        <div className="jmeter-vrt-detail-pane">
          {selectedSample ? (
            <>
              {/* Main Tabs (Sampler result / Request / Response data) */}
              <div className="vrt-tabs-bar">
                <button
                  type="button"
                  className={`vrt-tab ${mainTab === 'sampler-result' ? 'active' : ''}`}
                  onClick={() => setMainTab('sampler-result')}
                >
                  <FileText size={14} />
                  <span>Sampler result</span>
                </button>

                <button
                  type="button"
                  className={`vrt-tab ${mainTab === 'request' ? 'active' : ''}`}
                  onClick={() => setMainTab('request')}
                >
                  <Send size={14} />
                  <span>Request</span>
                </button>

                <button
                  type="button"
                  className={`vrt-tab ${mainTab === 'response' ? 'active' : ''}`}
                  onClick={() => setMainTab('response')}
                >
                  <Download size={14} />
                  <span>Response data</span>
                </button>

                <div className="vrt-tabs-spacer" />

                {isSelectedHttpRequest ? (
                  <button
                    type="button"
                    className="vrt-copy-btn curl-btn"
                    onClick={() => handleCopy(curlCommand)}
                    title="Copy cURL Command to Clipboard"
                  >
                    <Terminal size={13} />
                    <span>Copy cURL</span>
                  </button>
                ) : null}

                {/* Quick Copy */}
                <button
                  type="button"
                  className="vrt-copy-btn"
                  onClick={() => {
                    const text =
                      mainTab === 'sampler-result'
                        ? samplerResultText
                        : mainTab === 'request'
                          ? activeRequestSubTab === 'curl'
                            ? curlCommand
                            : activeRequestSubTab === 'headers'
                              ? requestHeaders
                              : decodeUnicodeEscapes(selectedSample.request || selectedSample.url || '')
                          : responseSubTab === 'headers'
                            ? formattedResponseHeaders
                            : responseBody
                    handleCopy(text)
                  }}
                  title="Copy current tab content"
                >
                  {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Tab 1: Sampler Result */}
              {mainTab === 'sampler-result' ? (
                <div className="vrt-tab-content sampler-result-view">
                  <div className="sampler-result-box">
                    <pre className="jmeter-monospace-pre">{samplerResultText}</pre>
                  </div>
                </div>
              ) : null}

              {/* Tab 2: Request */}
              {mainTab === 'request' ? (
                <div className="vrt-tab-content request-view">
                  <div className="vrt-subtabs-bar">
                    {isSelectedHttpRequest ? (
                      <button
                        type="button"
                        className={`vrt-subtab ${activeRequestSubTab === 'curl' ? 'active' : ''}`}
                        onClick={() => setRequestSubTab('curl')}
                      >
                        <Terminal size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                        cURL (Postman Snippet)
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`vrt-subtab ${activeRequestSubTab === 'body' ? 'active' : ''}`}
                      onClick={() => setRequestSubTab('body')}
                    >
                      Request Body
                    </button>
                    <button
                      type="button"
                      className={`vrt-subtab ${activeRequestSubTab === 'headers' ? 'active' : ''}`}
                      onClick={() => setRequestSubTab('headers')}
                    >
                      Request headers
                    </button>
                    {isSelectedHttpRequest ? (
                      <button
                        type="button"
                        className={`vrt-subtab ${activeRequestSubTab === 'url' ? 'active' : ''}`}
                        onClick={() => setRequestSubTab('url')}
                      >
                        URL & Parameters
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`vrt-subtab ${activeRequestSubTab === 'raw' ? 'active' : ''}`}
                      onClick={() => setRequestSubTab('raw')}
                    >
                      Raw Request
                    </button>
                  </div>

                  <div className="request-subtab-content">
                    {activeRequestSubTab === 'curl' && isSelectedHttpRequest ? (
                      <div className="curl-view">
                        {/* Postman Style Action Bar for Snippet */}
                        <div className="postman-snippet-bar">
                          <div className="postman-snippet-meta">
                            <span className="postman-snippet-title">Code snippet</span>
                            <div className="postman-lang-badge">
                              <span>cURL</span>
                              <ChevronDown size={12} />
                            </div>
                          </div>
                          <div className="postman-snippet-actions">
                            <button
                              type="button"
                              className="vrt-copy-btn curl-btn"
                              onClick={() => handleCopy(curlCommand)}
                              title="Copy cURL to Clipboard"
                            >
                              {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                              <span>{copied ? 'Copied!' : 'Copy cURL'}</span>
                            </button>
                          </div>
                        </div>

                        <CodeEditor
                          label={`cURL Code Snippet (${selectedSample.method || 'HTTP'} - ${selectedSample.label})`}
                          language="curl"
                          value={curlCommand}
                          minHeight={340}
                          readOnly
                          onChange={() => {}}
                        />
                      </div>
                    ) : activeRequestSubTab === 'headers' ? (
                      <div className="request-headers-wrap">
                        <pre className="jmeter-monospace-pre">{requestHeaders}</pre>
                      </div>
                    ) : activeRequestSubTab === 'url' && isSelectedHttpRequest && urlInfo ? (
                      <div className="url-breakdown">
                        <div className="url-meta-row">
                          <span className="url-meta-label">Method:</span>
                          <span className="url-method-pill">{selectedSample.method || 'HTTP'}</span>
                          <span className="url-meta-label">Protocol:</span>
                          <span>{urlInfo.protocol}</span>
                          <span className="url-meta-label">Host:</span>
                          <code>{urlInfo.host}</code>
                          <span className="url-meta-label">Path:</span>
                          <code>{urlInfo.pathname}</code>
                        </div>

                        {urlInfo.params.length > 0 ? (
                          <div className="url-params-table-wrap">
                            <span className="params-table-title">Query Parameters:</span>
                            <table className="url-params-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {urlInfo.params.map((p, idx) => (
                                  <tr key={idx}>
                                    <td className="param-key">{p.key}</td>
                                    <td className="param-val">{p.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    ) : activeRequestSubTab === 'body' ? (
                      <div className="request-body-wrap">
                        <CodeEditor
                          label={
                            selectedSample.label.toLowerCase().includes('jsr223') || selectedSample.label.toLowerCase().includes('beanshell')
                              ? `${selectedSample.label} - Groovy Script`
                              : isSelectedHttpRequest
                                ? 'Request Data'
                                : `${selectedSample.label} - Sampler Data`
                          }
                          language={
                            selectedSample.label.toLowerCase().includes('jsr223') || selectedSample.label.toLowerCase().includes('beanshell')
                              ? 'javascript'
                              : isSelectedHttpRequest && (selectedSample.request?.trim().startsWith('{') || selectedSample.request?.trim().startsWith('['))
                                ? 'json'
                                : 'text'
                          }
                          value={decodeUnicodeEscapes(selectedSample.request || (isSelectedHttpRequest ? selectedSample.url : '') || '(No request data)')}
                          minHeight={340}
                          readOnly
                          onChange={() => {}}
                        />
                      </div>
                    ) : (
                      <pre className="jmeter-monospace-pre">
                        {!isSelectedHttpRequest
                          ? `Sampler: ${selectedSample.label}\nThread: ${selectedSample.threadName || 'Thread Group 1-1'}\n\n${decodeUnicodeEscapes(selectedSample.request || '(No HTTP request data for this sampler)')}`
                          : `URL: ${selectedHttpUrl}\nThread: ${selectedSample.threadName}\n\n${decodeUnicodeEscapes(selectedSample.request || '')}`}
                      </pre>
                    )}
                  </div>
                </div>
              ) : null}

              {mainTab === 'response' ? (
                <div className="vrt-tab-content response-view">
                  {/* Postman-Style Response Header Bar: Body | Cookies | Headers | Test Results + Meta Badges */}
                  <div className="postman-response-header-bar">
                    <div className="postman-response-tabs">
                      <button
                        type="button"
                        className={`postman-res-tab ${responseSubTab === 'body' ? 'active' : ''}`}
                        onClick={() => setResponseSubTab('body')}
                      >
                        Body
                      </button>
                      <button
                        type="button"
                        className={`postman-res-tab ${responseSubTab === 'cookies' ? 'active' : ''}`}
                        onClick={() => setResponseSubTab('cookies')}
                      >
                        Cookies
                        {cookiesList.length > 0 ? (
                          <span className="postman-tab-count">{cookiesList.length}</span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        className={`postman-res-tab ${responseSubTab === 'headers' ? 'active' : ''}`}
                        onClick={() => setResponseSubTab('headers')}
                      >
                        Headers
                        <span className="postman-tab-count">{responseHeadersList.length}</span>
                      </button>
                      <button
                        type="button"
                        className={`postman-res-tab ${responseSubTab === 'tests' ? 'active' : ''}`}
                        onClick={() => setResponseSubTab('tests')}
                      >
                        Test Results
                        <span className="postman-tab-count">{selectedSample.success ? '1/1' : '0/1'}</span>
                      </button>
                    </div>

                    <div className="postman-response-meta-group">
                      <span
                        className={`postman-status-badge ${
                          selectedSample.success ? 'status-success' : 'status-error'
                        }`}
                      >
                        {selectedSample.code} {selectedSample.success ? 'OK' : 'Error'}
                      </span>

                      <span className="postman-meta-chip" title="Response Time / Elapsed">
                        <Clock size={12} style={{ verticalAlign: '-1px' }} />
                        {selectedSample.elapsed} ms
                      </span>

                      <span className="postman-meta-chip" title="Response Body Size">
                        <HardDrive size={12} style={{ verticalAlign: '-1px' }} />
                        {selectedSample.bytes > 1024
                          ? `${(selectedSample.bytes / 1024).toFixed(2)} KB`
                          : `${selectedSample.bytes} B`}
                      </span>

                      <button
                        type="button"
                        className="postman-save-btn"
                        onClick={handleDownloadResponse}
                        title="Save response as JSON file"
                      >
                        <Download size={12} />
                        <span>Save Response</span>
                      </button>
                    </div>
                  </div>

                  {/* Body Sub-Tab: Controls Bar + Formatted JSON Viewer */}
                  {responseSubTab === 'body' ? (
                    <>
                      <div className="postman-response-controls-bar">
                        <div className="postman-ctrl-left">
                          <div className="postman-json-select-wrap">
                            <span style={{ color: '#6366f1' }}>{'{ }'}</span>
                            <select
                              className="postman-json-select"
                              value={responseRenderer}
                              onChange={(e) => setResponseRenderer(e.target.value as ResponseRenderer)}
                            >
                              <option value="json">JSON</option>
                              {isSelectedHttpRequest ? (
                                <option value="curl-response">Raw HTTP (Status + Headers + Body)</option>
                              ) : null}
                              <option value="text">Text</option>
                              <option value="html">HTML</option>
                              <option value="xml">XML</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            className={`postman-view-toggle-btn ${responseRenderer === 'json' ? 'active' : ''}`}
                            onClick={() => setResponseRenderer('json')}
                          >
                            <Code2 size={12} />
                            <span>Pretty</span>
                          </button>

                          <button
                            type="button"
                            className={`postman-view-toggle-btn ${responseRenderer === 'text' ? 'active' : ''}`}
                            onClick={() => setResponseRenderer('text')}
                          >
                            <FileText size={12} />
                            <span>Raw</span>
                          </button>

                          <button
                            type="button"
                            className={`postman-view-toggle-btn ${responseRenderer === 'html' ? 'active' : ''}`}
                            onClick={() => setResponseRenderer('html')}
                          >
                            <Eye size={12} />
                            <span>Preview</span>
                          </button>
                        </div>

                        <div className="postman-ctrl-right">
                          <div className="response-search-group">
                            <Search size={12} />
                            <input
                              type="text"
                              placeholder="Search in response..."
                              value={responseSearchQuery}
                              onChange={(e) => setResponseSearchQuery(e.target.value)}
                            />
                          </div>

                          <button
                            type="button"
                            className="vrt-copy-btn"
                            onClick={() => handleCopy(responseBody)}
                            title="Copy Response Body"
                          >
                            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                            <span>{copied ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="response-rendered-content">
                        {responseRenderer === 'curl-response' && isSelectedHttpRequest ? (
                          <div className="response-curl-wrap">
                            <CodeEditor
                              label={`HTTP Response & Headers (${selectedSample.code} - ${selectedSample.elapsed}ms)`}
                              language="json"
                              value={curlResponsePreview}
                              minHeight={360}
                              readOnly
                              onChange={() => {}}
                            />
                          </div>
                        ) : responseRenderer === 'json' ? (
                          <div className="response-json-wrap">
                            <CodeEditor
                              label={`Response JSON (${selectedSample.code} - ${selectedSample.elapsed}ms)`}
                              language="json"
                              value={responseBody}
                              minHeight={360}
                              readOnly
                              onChange={() => {}}
                            />
                          </div>
                        ) : (
                          <div className="response-raw-wrap">
                            <pre className="jmeter-monospace-pre">{responseBody}</pre>
                          </div>
                        )}
                      </div>
                    </>
                  ) : responseSubTab === 'headers' ? (
                    <div className="response-headers-table-wrap" style={{ marginTop: '6px' }}>
                      <table className="url-params-table">
                        <thead>
                          <tr>
                            <th style={{ width: '35%' }}>Header Name</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {responseHeadersList.map((h, idx) => (
                            <tr key={idx}>
                              <td className="param-key">{h.name}</td>
                              <td className="param-val">{h.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : responseSubTab === 'cookies' ? (
                    <div className="response-cookies-wrap" style={{ marginTop: '6px' }}>
                      {cookiesList.length > 0 ? (
                        <table className="url-params-table">
                          <thead>
                            <tr>
                              <th>Cookie Name</th>
                              <th>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cookiesList.map((c, idx) => (
                              <tr key={idx}>
                                <td className="param-key">{c.name}</td>
                                <td className="param-val">{c.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="vrt-no-selection" style={{ minHeight: '120px' }}>
                          No cookies received from server in this response.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Test Results Sub-tab */
                    <div className="response-tests-wrap" style={{ marginTop: '6px', padding: '12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          background: selectedSample.success ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${selectedSample.success ? '#bbf7d0' : '#fecaca'}`,
                          color: selectedSample.success ? '#15803d' : '#b91c1c',
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      >
                        {selectedSample.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        <span>
                          {selectedSample.success
                            ? `PASS: Response code was ${selectedSample.code} (within acceptable range)`
                            : `FAIL: Response code was ${selectedSample.code} (or request timed out)`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div className="vrt-no-selection">No sample selected.</div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

