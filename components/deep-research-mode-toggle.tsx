'use client'

import { Search } from 'lucide-react'

import { useResearchMode } from '@/lib/hooks/use-research-mode'
import { useTranslations } from '@/lib/i18n/provider'
import { cn } from '@/lib/utils'

import { Toggle } from './ui/toggle'

export function DeepResearchModeToggle() {
  const t = useTranslations()
  const { isActive, toggleMode } = useResearchMode('deep-research')

  return (
    <Toggle
      aria-label={t('research.toggleDeepResearchMode')}
      pressed={isActive}
      onPressedChange={toggleMode}
      variant="outline"
      className={cn(
        'gap-1 px-3 border border-input text-muted-foreground bg-background',
        'data-[state=on]:bg-accent-blue',
        'data-[state=on]:text-accent-blue-foreground',
        'data-[state=on]:border-accent-blue-border',
        'hover:bg-accent hover:text-accent-foreground rounded-full'
      )}
    >
      <Search className="size-4" />
      <span className="text-xs">{t('research.deepResearch')}</span>
    </Toggle>
  )
}
