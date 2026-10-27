import { create } from 'zustand'
import { parsePostmanEnvironment } from '../utils/postman/postmanEnvironmentParser'
import type { EnvironmentItem, EnvironmentStore, EnvironmentVariable } from './environmentTypes'
import { DEFAULT_ENVIRONMENTS, STORAGE_KEY } from './environmentDefaults'

export type { EnvironmentItem, EnvironmentStore, EnvironmentVariable }

export function computeActiveVariables(
  environments: EnvironmentItem[],
  activeEnvId: string
): Record<string, string> {
  const active = environments.find((e) => e.id === activeEnvId) || environments[0]
  if (!active) return {}
  const map: Record<string, string> = {}
  for (const v of active.variables) {
    if (v.enabled && v.key.trim()) {
      map[v.key.trim()] = v.value
    }
  }
  return map
}

function loadStoredEnvironments(): {
  environments: EnvironmentItem[]
  activeEnvId: string
  activeVariables: Record<string, string>
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.environments) && parsed.environments.length > 0) {
        const hasLegacy = parsed.environments.some((e: EnvironmentItem) =>
          e.variables?.some((v) => v.value?.includes('httpbin.org'))
        )
        if (!hasLegacy) {
          const envs = parsed.environments
          const activeId = parsed.activeEnvId || envs[0].id
          return {
            environments: envs,
            activeEnvId: activeId,
            activeVariables: computeActiveVariables(envs, activeId),
          }
        }
      }
    }
  } catch {
    // fallback
  }
  return {
    environments: DEFAULT_ENVIRONMENTS,
    activeEnvId: 'qc',
    activeVariables: computeActiveVariables(DEFAULT_ENVIRONMENTS, 'qc'),
  }
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
  activeVariables: initial.activeVariables,

  setActiveEnvironment: (id) => {
    const envs = get().environments
    const vars = computeActiveVariables(envs, id)
    set({ activeEnvId: id, activeVariables: vars })
    persistState(envs, id)
  },

  getActiveEnvironment: () => {
    const state = get()
    return state.environments.find((e) => e.id === state.activeEnvId) || state.environments[0]
  },

  getActiveVariables: () => {
    return get().activeVariables
  },

  addEnvironment: (name, variables) => {
    const newEnv: EnvironmentItem = {
      id: `env_${Date.now()}`,
      name,
      variables,
    }
    const updated = [...get().environments, newEnv]
    const vars = computeActiveVariables(updated, newEnv.id)
    set({ environments: updated, activeEnvId: newEnv.id, activeVariables: vars })
    persistState(updated, newEnv.id)
    return newEnv.id
  },

  updateEnvironment: (id, updates) => {
    const updated = get().environments.map((e) => (e.id === id ? { ...e, ...updates } : e))
    const currentActiveId = get().activeEnvId
    const vars = computeActiveVariables(updated, currentActiveId)
    set({ environments: updated, activeVariables: vars })
    persistState(updated, currentActiveId)
  },

  deleteEnvironment: (id) => {
    const current = get().environments
    if (current.length <= 1) return
    const updated = current.filter((e) => e.id !== id)
    const nextActive = get().activeEnvId === id ? updated[0].id : get().activeEnvId
    const vars = computeActiveVariables(updated, nextActive)
    set({ environments: updated, activeEnvId: nextActive, activeVariables: vars })
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
    const vars = computeActiveVariables(updated, envItem.id)
    set({ environments: updated, activeEnvId: envItem.id, activeVariables: vars })
    persistState(updated, envItem.id)

    return { success: true, name: envItem.name, count: envItem.variables.length }
  },
}))
