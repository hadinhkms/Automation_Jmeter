/* eslint-disable react-refresh/only-export-components */
import {
  Braces,
  Clock3,
  Code2,
  Cookie,
  FileInput,
  FileJson2,
  FileText,
  FolderCog,
  GitBranch,
  Globe2,
  ListChecks,
  Network,
  PanelTop,
  PlayCircle,
  Repeat2,
  ScrollText,
  Settings2,
  ShieldCheck,
  Table2,
  Users,
  Variable,
  type LucideIcon,
} from 'lucide-react'
import type { JMeterComponentType } from '../models/jmeter'

export const componentMeta: Record<
  JMeterComponentType,
  { label: string; icon: LucideIcon; tone: string }
> = {
  TestPlan: { label: 'Test Plan', icon: FileText, tone: 'root' },
  UserDefinedVariables: { label: 'User Defined Variables', icon: Variable, tone: 'config' },
  ThreadGroup: { label: 'Thread Group', icon: Users, tone: 'thread' },
  HTTPRequestDefaults: { label: 'HTTP Request Defaults', icon: Globe2, tone: 'config' },
  HTTPRequest: { label: 'HTTP Request', icon: Network, tone: 'sampler' },
  HTTPHeaderManager: { label: 'HTTP Header Manager', icon: PanelTop, tone: 'config' },
  HTTPCookieManager: { label: 'HTTP Cookie Manager', icon: Cookie, tone: 'config' },
  CSVDataSet: { label: 'CSV Data Set Config', icon: Table2, tone: 'config' },
  TransactionController: { label: 'Transaction Controller', icon: GitBranch, tone: 'controller' },
  IfController: { label: 'If Controller', icon: GitBranch, tone: 'controller' },
  LoopController: { label: 'Loop Controller', icon: Repeat2, tone: 'controller' },
  ConstantTimer: { label: 'Constant Timer', icon: Clock3, tone: 'timer' },
  JSONExtractor: { label: 'JSON Extractor', icon: FileJson2, tone: 'processor' },
  RegexExtractor: { label: 'Regular Expression Extractor', icon: Braces, tone: 'processor' },
  ResponseAssertion: { label: 'Response Assertion', icon: ShieldCheck, tone: 'assertion' },
  JSR223Sampler: { label: 'JSR223 Sampler', icon: Code2, tone: 'sampler' },
  JSR223PreProcessor: { label: 'JSR223 PreProcessor', icon: Code2, tone: 'processor' },
  JSR223PostProcessor: { label: 'JSR223 PostProcessor', icon: Code2, tone: 'processor' },
  JSR223Assertion: { label: 'JSR223 Assertion', icon: Code2, tone: 'assertion' },
  ViewResultsTree: { label: 'View Results Tree', icon: ListChecks, tone: 'listener' },
  SummaryReport: { label: 'Summary Report', icon: ScrollText, tone: 'listener' },
  AggregateReport: { label: 'Aggregate Report', icon: FileInput, tone: 'listener' },
  UnsupportedComponent: { label: 'Unsupported Component', icon: FolderCog, tone: 'unsupported' },
}

export const RunIcon = PlayCircle
export const SettingsIcon = Settings2
