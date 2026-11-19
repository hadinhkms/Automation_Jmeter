import { useCallback, useEffect, useState } from 'react'
import type { ActiveModal, AppStore } from '../appTypes'

/** Active modal state, open/close/toggle helpers and the global Escape-to-close handler. */
export function useModalState(store: AppStore) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [isPromptBeforeRun, setIsPromptBeforeRun] = useState(false)

  const openModal = (modal: ActiveModal) => {
    setActiveModal(modal)
    store.setSettingsOpen(modal === 'settings')
  }

  const closeModal = useCallback(() => {
    setActiveModal(null)
    store.setSettingsOpen(false)
  }, [store])

  const toggleModal = (modal: ActiveModal) => {
    if (activeModal === modal) {
      closeModal()
    } else {
      openModal(modal)
    }
  }

  useEffect(() => {
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal) {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleGlobalEsc)
    return () => window.removeEventListener('keydown', handleGlobalEsc)
  }, [activeModal, closeModal])

  return { activeModal, openModal, closeModal, toggleModal, isPromptBeforeRun, setIsPromptBeforeRun }
}
