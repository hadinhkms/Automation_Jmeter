import type { AppCommands } from '../../../models/appCommands'

export interface MenuItem {
  label?: string
  shortcut?: string
  action?: keyof AppCommands
  disabled?: boolean
  separator?: boolean
}

export const menuItems: Record<string, MenuItem[]> = {
  File: [
    { label: 'New', shortcut: 'Ctrl+N', action: 'newPlan' },
    { label: 'Open JMX…', shortcut: 'Ctrl+O', action: 'openJmx' },
    { label: 'Template Gallery…', action: 'openTemplateGallery' },
    { separator: true },
    { label: 'Save', shortcut: 'Ctrl+S', action: 'save' },
    { label: 'Save As…', shortcut: 'Ctrl+Shift+S', action: 'saveAs' },
    { label: 'Export JMX…', action: 'exportJmx' },
    { separator: true },
    { label: 'Git Manager & Diff…', action: 'openGitManager' },
  ],
  Edit: [
    { label: 'Undo', shortcut: 'Ctrl+Z', disabled: true },
    { label: 'Redo', shortcut: 'Ctrl+Y', disabled: true },
    { separator: true },
    { label: 'Cut', shortcut: 'Ctrl+X', action: 'cut' },
    { label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
    { label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
    { label: 'Duplicate', shortcut: 'Ctrl+D', action: 'duplicate' },
    { label: 'Delete', shortcut: 'Delete', action: 'remove' },
  ],
  Search: [{ label: 'Search Tree…', shortcut: 'Ctrl+F', disabled: true }],
  Run: [
    { label: 'Start', shortcut: 'Ctrl+R', action: 'start' },
    { label: 'Stop', action: 'stop' },
    { label: 'Shutdown', action: 'shutdown' },
    { separator: true },
    { label: 'View Workload Curve…', action: 'openWorkloadGraph' },
    { label: 'SLA Quality Gates…', action: 'openSlaSettings' },
    { separator: true },
    { label: 'Clear Results', action: 'clear' },
    { separator: true },
    { label: 'Toggle Live Console', action: 'toggleConsole' },
    { label: 'Open HTML Report', action: 'openHtmlReport' },
  ],
  Options: [
    { label: 'Plugins Manager…', action: 'openPluginsManager' },
    { label: 'SLA Quality Gates…', action: 'openSlaSettings' },
    { label: 'Git Version Control…', action: 'openGitManager' },
    { separator: true },
    { label: 'JMeter Runner Settings…', action: 'openSettings' },
    { separator: true },
    { label: 'Look and Feel', disabled: true },
  ],
  Tools: [
    { label: 'Enterprise Template Gallery…', action: 'openTemplateGallery' },
    { label: 'Workload Curve Graph…', action: 'openWorkloadGraph' },
    { label: 'Browser & Network Recorder…', shortcut: 'Ctrl+Shift+R', action: 'openBrowserRecorder' },
    { label: 'Import from cURL…', action: 'importCurl' },
    { label: 'Import Postman Collection…', action: 'importPostman' },
    { label: 'Local Mock Server…', action: 'openMockServer' },
    { label: 'Data-Driven Test – Import CSV…', action: 'openDdtWizard' },
    { label: 'Project File Manager...', action: 'openAssetManager' },
    { label: 'Plugins Manager…', action: 'openPluginsManager' },
    { label: 'Git Manager & Diff…', action: 'openGitManager' },
    { separator: true },
    { label: 'Function Helper Dialog', shortcut: 'Ctrl+Shift+F1', disabled: true },
    { label: 'Generate HTML report', action: 'openHtmlReport' },
    { label: 'Export transactions for report', disabled: true },
    { label: 'Compile JSR223 Test Elements', disabled: true },
    { label: 'Create a heap dump', disabled: true },
    { label: 'Create a thread dump', disabled: true },
  ],
  Help: [
    { label: 'User Guide & Documentation (HTML)', action: 'openUserGuide' },
    { separator: true },
    { label: 'About JMeter Web UI', disabled: true },
  ],
}
