import {
  FileCode2,
  FileJson,
  FolderArchive,
  Radio,
  Sparkles,
  Activity,
  ShieldCheck,
  GitBranch,
  Server,
  FileSpreadsheet,
} from 'lucide-react'
import type { AppCommands } from '../../menu/MenuBar'
import { ToolButton } from './ToolButton'

/** Enterprise feature buttons (templates / workload / SLA / git) shown after the file actions. */
export function ToolbarFeatureButtons({ commands, activeModal }: { commands: AppCommands; activeModal?: string | null }) {
  return (
    <>
      <ToolButton
        title="Enterprise Template Gallery"
        action={commands.openTemplateGallery}
        active={activeModal === 'templates'}
      >
        <Sparkles size={17} style={{ color: activeModal === 'templates' ? '#ffffff' : '#f59e0b' }} />
      </ToolButton>
      <ToolButton
        title="Visual Workload Curve & VUs Ramp-Up"
        action={commands.openWorkloadGraph}
        active={activeModal === 'workload'}
      >
        <Activity size={17} style={{ color: activeModal === 'workload' ? '#ffffff' : '#3b82f6' }} />
      </ToolButton>
      <ToolButton
        title="SLA Quality Gates & Alerting"
        action={commands.openSlaSettings}
        active={activeModal === 'sla'}
      >
        <ShieldCheck size={17} style={{ color: activeModal === 'sla' ? '#ffffff' : '#10b981' }} />
      </ToolButton>
      <ToolButton
        title="Git Version Control & Visual Diff"
        action={commands.openGitManager}
        active={activeModal === 'git'}
      >
        <GitBranch size={17} style={{ color: activeModal === 'git' ? '#ffffff' : '#a78bfa' }} />
      </ToolButton>
    </>
  )
}

/** Import / recorder / data tool buttons. */
export function ToolbarImportButtons({ commands, activeModal }: { commands: AppCommands; activeModal?: string | null }) {
  return (
    <>
      <ToolButton
        title="Import from cURL… (Tools -> Import from cURL)"
        action={commands.importCurl}
        active={activeModal === 'curl'}
      >
        <FileCode2 size={17} />
      </ToolButton>
      <ToolButton
        title="Import Postman Collection… (Tools -> Import Postman Collection)"
        action={commands.importPostman}
        active={activeModal === 'postman'}
      >
        <FileJson size={17} style={{ color: activeModal === 'postman' ? '#ffffff' : '#f59e0b' }} />
      </ToolButton>
      <ToolButton
        title="Local Mock Server… (Tools -> Local Mock Server)"
        action={commands.openMockServer}
        active={activeModal === 'mock'}
      >
        <Server size={17} />
      </ToolButton>
      <ToolButton title="Data-Driven Test – Import CSV… (Tools menu)" action={commands.openDdtWizard} active={activeModal === 'ddt'}>
        <FileSpreadsheet size={17} />
      </ToolButton>
      <ToolButton
        title="Project File Manager (upload CSV, attachments, files)"
        action={commands.openAssetManager}
        active={activeModal === 'assets'}
      >
        <FolderArchive size={17} />
      </ToolButton>
      <ToolButton
        title="Browser & Network API Recorder… (Tools -> Browser Recorder)"
        action={commands.openBrowserRecorder}
        active={activeModal === 'recorder'}
      >
        <Radio size={17} style={{ color: activeModal === 'recorder' ? '#ffffff' : '#818cf8' }} />
      </ToolButton>
    </>
  )
}
