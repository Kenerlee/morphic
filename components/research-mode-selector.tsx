'use client'

import { useEffect, useState } from 'react'

import { FileSearch, Globe, Home, Sparkles } from 'lucide-react'

import { useTranslations } from '@/lib/i18n/provider'
import { cn } from '@/lib/utils'
import { getCookie, setCookie } from '@/lib/utils/cookies'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select'

export type ResearchModeType =
  | 'none'
  | 'search'
  | 'due-diligence'
  | 'homestay'

interface ModeOption {
  value: ResearchModeType
  labelKey: string
  icon: React.ReactNode
}

const modeOptions: ModeOption[] = [
  {
    value: 'none',
    labelKey: 'researchMode.none',
    icon: <Sparkles className="size-4" />
  },
  {
    value: 'search',
    labelKey: 'chat.search',
    icon: <Globe className="size-4" />
  },
  {
    value: 'due-diligence',
    labelKey: 'research.research',
    icon: <FileSearch className="size-4" />
  },
  {
    value: 'homestay',
    labelKey: 'homestay.homestayResearch',
    icon: <Home className="size-4" />
  }
]

export function ResearchModeSelector() {
  const t = useTranslations()
  const [currentMode, setCurrentMode] = useState<ResearchModeType>('none')
  const [mounted, setMounted] = useState(false)

  // Initialize from cookies
  useEffect(() => {
    setMounted(true)
    // Check which mode is active
    if (getCookie('search-mode') === 'true') {
      setCurrentMode('search')
    } else if (getCookie('due-diligence-mode') === 'true') {
      setCurrentMode('due-diligence')
    } else if (getCookie('homestay-mode') === 'true') {
      setCurrentMode('homestay')
    } else {
      setCurrentMode('none')
    }
  }, [])

  const handleModeChange = (value: ResearchModeType) => {
    setCurrentMode(value)

    // Clear all mode cookies first
    const modes = ['search', 'due-diligence', 'deep-research', 'homestay']
    modes.forEach(m => {
      setCookie(`${m}-mode`, 'false')
    })

    // Set the selected mode
    if (value !== 'none') {
      setCookie(`${value}-mode`, 'true')
    }

    // Trigger event for other components
    window.dispatchEvent(
      new CustomEvent('research-mode-change', {
        detail: { activeMode: value === 'none' ? null : value }
      })
    )
  }

  // Get current mode label and icon
  const currentOption = modeOptions.find(opt => opt.value === currentMode)

  if (!mounted) {
    return (
      <div className="h-9 w-32 bg-muted rounded-full animate-pulse" />
    )
  }

  return (
    <Select value={currentMode} onValueChange={handleModeChange}>
      <SelectTrigger
        className={cn(
          'w-auto min-w-[120px] gap-2 rounded-full border border-input bg-background text-sm',
          currentMode !== 'none' &&
            'bg-accent-blue text-accent-blue-foreground border-accent-blue-border'
        )}
      >
        <div className="flex items-center gap-2">
          {currentOption?.icon}
          <SelectValue>
            {currentOption ? t(currentOption.labelKey) : t('researchMode.select')}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {modeOptions.map(option => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              <span>{t(option.labelKey)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
