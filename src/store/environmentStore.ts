import { create } from 'zustand'
import { parsePostmanEnvironment } from '../utils/postman/postmanEnvironmentParser'

export interface EnvironmentVariable {
  key: string
  value: string
  enabled: boolean
}

export interface EnvironmentItem {
  id: string
  name: string
  variables: EnvironmentVariable[]
}

interface EnvironmentStore {
  environments: EnvironmentItem[]
  activeEnvId: string
  setActiveEnvironment: (id: string) => void
  getActiveEnvironment: () => EnvironmentItem | undefined
  getActiveVariables: () => Record<string, string>
  addEnvironment: (name: string, variables: EnvironmentVariable[]) => string
  updateEnvironment: (id: string, updates: Partial<EnvironmentItem>) => void
  deleteEnvironment: (id: string) => void
  importFromPostmanJson: (jsonString: string) => { success: boolean; name?: string; count?: number; error?: string }
}

const STORAGE_KEY = 'jmeter_environments_v1'

const DEFAULT_ENVIRONMENTS: EnvironmentItem[] = [
  {
    id: 'dev',
    name: 'Dev Environment',
    variables: [{ key: 'baseUrl', value: 'https://httpbin.org', enabled: true }],
  },
  {
    id: 'qc',
    name: 'QC Environment',
    variables: [{ key: 'baseUrl', value: 'https://httpbin.org', enabled: true }],
  },
  {
    id: 'staging',
    name: 'Staging Environment',
    variables: [{ key: 'baseUrl', value: 'https://httpbin.org', enabled: true }],
  },
  {
    id: 'prod',
    name: 'Production Environment',
    variables: [{ key: 'baseUrl', value: 'https://httpbin.org', enabled: true }],
  },
]

function loadStoredEnvironments(): { environments: EnvironmentItem[]; activeEnvId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.environments) && parsed.environments.length > 0) {
        return {
          environments: parsed.environments,
          activeEnvId: parsed.activeEnvId || parsed.environments[0].id,
        }
      }
    }
  } catch {
    // fallback
  }
  return { environments: DEFAULT_ENVIRONMENTS, activeEnvId: 'dev' }
}

function persistState(environments: EnvironmentItem[], activeEnvId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ environments, activeEnvId }))
  } catch {
    // ignore storage quota errors
  }
}

const initial = loadStoredEnvironments()

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  environments: initial.environments,
  activeEnvId: initial.activeEnvId,

  setActiveEnvironment: (id) => {
    set({ activeEnvId: id })
    persistState(get().environments, id)
  },

  getActiveEnvironment: () => {
    const state = get()
    return state.environments.find((e) => e.id === state.activeEnvId) || state.environments[0]
  },

  getActiveVariables: () => {
    const active = get().getActiveEnvironment()
    if (!active) return {}
    const map: Record<string, string> = {}
    for (const v of active.variables) {
      if (v.enabled && v.key.trim()) {
        map[v.key.trim()] = v.value
      }
    }
    return map
  },

  addEnvironment: (name, variables) => {
    const newEnv: EnvironmentItem = {
      id: `env_${Date.now()}`,
      name,
      variables,
    }
    const updated = [...get().environments, newEnv]
    set({ environments: updated, activeEnvId: newEnv.id })
    persistState(updated, newEnv.id)
    return newEnv.id
  },

  updateEnvironment: (id, updates) => {
    const updated = get().environments.map((e) => (e.id === id ? { ...e, ...updates } : e))
    set({ environments: updated })
    persistState(updated, get().activeEnvId)
  },

  deleteEnvironment: (id) => {
    const current = get().environments
    if (current.length <= 1) return
    const updated = current.filter((e) => e.id !== id)
    const nextActive = get().activeEnvId === id ? updated[0].id : get().activeEnvId
    set({ environments: updated, activeEnvId: nextActive })
    persistState(updated, nextActive)
  },

  importFromPostmanJson: (jsonString) => {
    const { environment, error } = parsePostmanEnvironment(jsonString)
    if (!environment || error) {
      return { success: false, error: error || 'Failed to parse environment file.' }
    }

    const envItem: EnvironmentItem = {
      id: `env_${Date.now()}`,
      name: environment.name,
      variables: environment.variables.map((v) => ({
        key: v.key,
        value: v.value,
        enabled: v.enabled,
      })),
    }

    const updated = [...get().environments, envItem]
    set({ environments: updated, activeEnvId: envItem.id })
    persistState(updated, envItem.id)

    return { success: true, name: envItem.name, count: envItem.variables.length }
  },
}))
