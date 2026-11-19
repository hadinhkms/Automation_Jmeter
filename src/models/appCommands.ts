export interface AppCommands {
  newPlan: () => void
  openJmx: () => void
  save: () => void
  saveAs: () => void
  exportJmx: () => void
  cut: () => void
  copy: () => void
  paste: () => void
  duplicate: () => void
  remove: () => void
  start: () => void
  stop: () => void
  shutdown: () => void
  clear: () => void
  toggleConsole: () => void
  openSettings: () => void
  openHtmlReport: () => void
  importCurl: () => void
  importPostman: () => void
  openBrowserRecorder: () => void
  openPluginsManager: () => void
  openAssetManager: () => void
  openTemplateGallery: () => void
  openWorkloadGraph: () => void
  openSlaSettings: () => void
  openGitManager: () => void
  openMockServer: () => void
  openDdtWizard: () => void
  openUserGuide: () => void
}

export type DisabledCommands = Partial<Record<keyof AppCommands, boolean>>
