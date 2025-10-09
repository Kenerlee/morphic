'use client'

import { useEffect, useState } from 'react'

import { getCookie, setCookie } from '@/lib/utils/cookies'

export type ResearchMode = 'search' | 'due-diligence' | 'deep-research' | null

/**
 * Hook to manage research mode selection with mutual exclusion
 * Only one mode can be active at a time
 */
export function useResearchMode(mode: Exclude<ResearchMode, null>) {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    // Check if this mode is currently active
    const savedMode = getCookie(`${mode}-mode`)
    setIsActive(savedMode === 'true')
  }, [mode])

  const toggleMode = (pressed: boolean) => {
    if (pressed) {
      // Activate this mode and deactivate others
      const modes: Exclude<ResearchMode, null>[] = [
        'search',
        'due-diligence',
        'deep-research'
      ]

      modes.forEach(m => {
        if (m === mode) {
          setCookie(`${m}-mode`, 'true')
          setIsActive(true)
        } else {
          setCookie(`${m}-mode`, 'false')
        }
      })

      // Trigger a custom event to notify other components
      window.dispatchEvent(
        new CustomEvent('research-mode-change', {
          detail: { activeMode: mode }
        })
      )
    } else {
      // Deactivate this mode
      setCookie(`${mode}-mode`, 'false')
      setIsActive(false)

      window.dispatchEvent(
        new CustomEvent('research-mode-change', {
          detail: { activeMode: null }
        })
      )
    }
  }

  // Listen for mode changes from other components
  useEffect(() => {
    const handleModeChange = (event: CustomEvent) => {
      const { activeMode } = event.detail
      setIsActive(activeMode === mode)
    }

    window.addEventListener(
      'research-mode-change',
      handleModeChange as EventListener
    )

    return () => {
      window.removeEventListener(
        'research-mode-change',
        handleModeChange as EventListener
      )
    }
  }, [mode])

  return { isActive, toggleMode }
}
