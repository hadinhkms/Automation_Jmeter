import type { LucideIcon } from 'lucide-react'
import type { TestPlanNode } from './jmeter'

export interface TemplateItem {
  id: string
  title: string
  category: 'E-Commerce' | 'API' | 'Long-Running' | 'Stress' | 'GraphQL' | 'WebSocket'
  description: string
  icon: LucideIcon
  badge: string
  tags: string[]
  buildPlan: () => TestPlanNode
}
