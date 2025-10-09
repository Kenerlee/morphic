'use client'

import { FileSearch } from 'lucide-react'

import { useResearchMode } from '@/lib/hooks/use-research-mode'
import { useTranslations } from '@/lib/i18n/provider'
import { cn } from '@/lib/utils'

import { Toggle } from './ui/toggle'

export function DueDiligenceModeToggle() {
  const t = useTranslations()
  const { isActive, toggleMode } = useResearchMode('due-diligence')

  return (
    <Toggle
      aria-label="Toggle due diligence mode"
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
      <FileSearch className="size-4" />
      <span className="text-xs">{t('research.research')}</span>
    </Toggle>
  )
}
