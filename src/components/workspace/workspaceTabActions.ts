/** Context-menu "close others": keep only `id` and select it, so the editor never stays on a node whose tab was closed. */
export function closeOtherTabs(id: string, closeOthers: (id: string) => void, onSelect: (id: string) => void): void {
  closeOthers(id)
  onSelect(id)
}
