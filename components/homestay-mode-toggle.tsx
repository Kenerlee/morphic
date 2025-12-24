'use client'

import { useEffect, useState } from 'react'

import { Home } from 'lucide-react'

import { useResearchMode } from '@/lib/hooks/use-research-mode'
import { useTranslations } from '@/lib/i18n/provider'
import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'

export function HomestayModeToggle() {
  const t = useTranslations()
  const { isActive, toggleMode } = useResearchMode('homestay')
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering tooltip after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const showActive = mounted && isActive

  const button = (
    <Button
      variant="outline"
      onClick={() => toggleMode(!isActive)}
      className={cn(
        'gap-1 px-3 border border-input text-muted-foreground bg-background rounded-full',
        showActive
          ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground'
          : 'hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Home className="size-4" />
      <span className="text-xs">{t('homestay.homestayResearch')}</span>
    </Button>
  )

  // Render without tooltip on server to avoid hydration mismatch
  if (!mounted) {
    return button
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{t('homestay.tooltip')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
