/** Stores the 50 most recent debug (Send Request) calls in IndexedDB, FIFO (FEAT-P5). */

export const HISTORY_LIMIT = 50
const DB_NAME = 'jmeter-web-studio'
const STORE = 'requestHistory'

export interface HistoryEntry {
  id: string
  timestamp: number
  nodeId: string
  nodeName: string
  method: string
  url: string
  headers: Array<{ name: string; value: string }>
  body?: string
  status: number
  statusText: string
  latencyMs: number
  sizeBytes: number
}

type Listener = () => void

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

class HistoryStorageService {
  private dbPromise: Promise<IDBDatabase | null> | null = null
  /** Used when IndexedDB is unavailable (private mode, tests); same FIFO rules. */
  private memory: HistoryEntry[] = []
  private listeners = new Set<Listener>()

  private open(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise
    this.dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null)
      try {
        const request = indexedDB.open(DB_NAME, 1)
        request.onupgradeneeded = () => {
          const store = request.result.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp')
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
    return this.dbPromise
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((l) => l())
  }

  /** Newest first. */
  async list(): Promise<HistoryEntry[]> {
    const db = await this.open()
    if (!db) return [...this.memory].sort((a, b) => b.timestamp - a.timestamp)
    const all = await promisify(db.transaction(STORE).objectStore(STORE).getAll() as IDBRequest<HistoryEntry[]>)
    return all.sort((a, b) => b.timestamp - a.timestamp)
  }

  async add(entry: HistoryEntry): Promise<void> {
    const db = await this.open()
    if (!db) {
      this.memory = [entry, ...this.memory].sort((a, b) => b.timestamp - a.timestamp).slice(0, HISTORY_LIMIT)
    } else {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      store.put(entry)
      const keys = await promisify(store.index('timestamp').getAllKeys() as IDBRequest<IDBValidKey[]>)
      // Index keys come back oldest first; drop everything beyond the limit.
      keys.slice(0, Math.max(0, keys.length - HISTORY_LIMIT)).forEach((key) => store.delete(key))
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    }
    this.notify()
  }

  async remove(id: string): Promise<void> {
    const db = await this.open()
    if (!db) this.memory = this.memory.filter((e) => e.id !== id)
    else await promisify(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id))
    this.notify()
  }

  async clear(): Promise<void> {
    const db = await this.open()
    if (!db) this.memory = []
    else await promisify(db.transaction(STORE, 'readwrite').objectStore(STORE).clear())
    this.notify()
  }
}

export const historyStorageService = new HistoryStorageService()
