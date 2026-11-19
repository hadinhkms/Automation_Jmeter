import { useState, useEffect, useCallback } from 'react'
import {
  jmeterPluginService,
  type PluginsManagerState,
  type InstalledPlugin,
} from '../../../services/jmeterPluginService'
import type { StatusMessage, TabType } from './constants'

export function usePluginsManager(isOpen: boolean) {
  const [activeTab, setActiveTab] = useState<TabType>('installed')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [pluginsState, setPluginsState] = useState<PluginsManagerState | null>(null)
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  const loadState = useCallback(async () => {
    setIsLoading(true)
    try {
      const state = await jmeterPluginService.getPluginsState()
      setPluginsState(state)
      if (state.installed.length > 0 && !selectedPluginId) {
        setSelectedPluginId(state.installed[0].id)
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to scan JMeter plugins.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedPluginId])

  useEffect(() => {
    if (isOpen) {
      loadState()
    }
  }, [isOpen, loadState])

  const handleInstall = async (pluginId: string) => {
    setIsProcessing(true)
    setStatusMessage({ type: 'info', text: `Downloading and installing plugin "${pluginId}"...` })
    try {
      const res = await jmeterPluginService.installPlugin(pluginId)
      setStatusMessage({ type: 'success', text: res.message })
      await loadState()
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Installation failed.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUninstall = async (plugin: InstalledPlugin) => {
    if (!window.confirm(`Are you sure you want to uninstall "${plugin.name}" (${plugin.id})?`)) return
    setIsProcessing(true)
    setStatusMessage({ type: 'info', text: `Removing plugin "${plugin.name}"...` })
    try {
      const res = await jmeterPluginService.uninstallPlugin(plugin.id, plugin.jarPath)
      setStatusMessage({ type: 'success', text: res.message })
      await loadState()
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to uninstall plugin.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    activeTab,
    setActiveTab,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    pluginsState,
    selectedPluginId,
    setSelectedPluginId,
    isLoading,
    isProcessing,
    statusMessage,
    setStatusMessage,
    loadState,
    handleInstall,
    handleUninstall,
  }
}

export type PluginsManager = ReturnType<typeof usePluginsManager>
