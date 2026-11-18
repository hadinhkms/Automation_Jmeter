import { create } from 'zustand'

/** Max sampler tabs kept open; the least recently opened unpinned tab is dropped first. */
export const MAX_WORKSPACE_TABS = 8

interface WorkspaceTabsState {
  openIds: string[]
  /** Adds a tab (no-op when already open). */
  open: (id: string) => void
  close: (id: string) => void
  closeOthers: (id: string) => void
  /** Drops tabs whose node no longer exists in the tree. */
  prune: (existingIds: Set<string>) => void
}

export const useWorkspaceTabsStore = create<WorkspaceTabsState>((set) => ({
  openIds: [],
  open: (id) =>
    set((state) => {
      if (state.openIds.includes(id)) return state
      const next = [...state.openIds, id]
      return { openIds: next.length > MAX_WORKSPACE_TABS ? next.slice(next.length - MAX_WORKSPACE_TABS) : next }
    }),
  close: (id) => set((state) => ({ openIds: state.openIds.filter((x) => x !== id) })),
  closeOthers: (id) => set((state) => ({ openIds: state.openIds.filter((x) => x === id) })),
  prune: (existingIds) =>
    set((state) => {
      const next = state.openIds.filter((id) => existingIds.has(id))
      return next.length === state.openIds.length ? state : { openIds: next }
    }),
}))
