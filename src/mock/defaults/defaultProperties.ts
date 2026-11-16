import type { JMeterComponentType } from '../../models/jmeter'
import { configDefaults } from './configDefaults'
import { planDefaults } from './planDefaults'
import { samplerDefaults } from './samplerDefaults'

export function defaultProperties(
  type: JMeterComponentType,
): Record<string, unknown> {
  const common = { comments: '' }
  return (
    planDefaults(type, common) ??
    samplerDefaults(type, common) ??
    configDefaults(type, common) ??
    common
  )
}
