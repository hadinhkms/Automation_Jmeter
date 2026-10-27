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

export interface EnvironmentStore {
  environments: EnvironmentItem[]
  activeEnvId: string
  activeVariables: Record<string, string>
  setActiveEnvironment: (id: string) => void
  getActiveEnvironment: () => EnvironmentItem | undefined
  getActiveVariables: () => Record<string, string>
  addEnvironment: (name: string, variables: EnvironmentVariable[]) => string
  updateEnvironment: (id: string, updates: Partial<EnvironmentItem>) => void
  deleteEnvironment: (id: string) => void
  importFromPostmanJson: (jsonString: string) => { success: boolean; name?: string; count?: number; error?: string }
}
