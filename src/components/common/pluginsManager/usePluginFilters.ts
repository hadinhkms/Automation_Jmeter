import { useMemo } from 'react'
import type { PluginsManagerState } from '../../../services/jmeterPluginService'
import type { SelectedPlugin, TabType } from './constants'

export function usePluginFilters(
  pluginsState: PluginsManagerState | null,
  searchQuery: string,
  selectedCategory: string,
  selectedPluginId: string | null,
  activeTab: TabType,
) {
  // Filtered lists
  const filteredInstalled = useMemo(() => {
    if (!pluginsState) return []
    return pluginsState.installed.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory
      return matchSearch && matchCategory
    })
  }, [pluginsState, searchQuery, selectedCategory])

  const filteredAvailable = useMemo(() => {
    if (!pluginsState) return []
    return pluginsState.available.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory
      return matchSearch && matchCategory
    })
  }, [pluginsState, searchQuery, selectedCategory])

  const filteredUpgrades = useMemo(() => {
    if (!pluginsState) return []
    return pluginsState.upgrades.filter((p) => {
      return (
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [pluginsState, searchQuery])

  // Selected item lookup
  const selectedPlugin: SelectedPlugin | null = useMemo(() => {
    if (!selectedPluginId || !pluginsState) return null

    if (activeTab === 'installed') {
      return pluginsState.installed.find((p) => p.id === selectedPluginId) || null
    }
    if (activeTab === 'available') {
      return pluginsState.available.find((p) => p.id === selectedPluginId) || null
    }
    if (activeTab === 'upgrades') {
      const up = pluginsState.upgrades.find((p) => p.id === selectedPluginId)
      if (!up) return null
      return {
        ...up,
        version: up.latestVersion,
        installedVersion: up.currentVersion,
        category: 'Other',
        vendor: 'JMeter-Plugins.org',
        helpUrl: 'https://jmeter-plugins.org/',
      }
    }
    return null
  }, [selectedPluginId, pluginsState, activeTab])

  return { filteredInstalled, filteredAvailable, filteredUpgrades, selectedPlugin }
}
