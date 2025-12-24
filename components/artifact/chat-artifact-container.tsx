'use client'

import React, { useEffect, useState } from 'react'

import { Menu } from 'lucide-react'

import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'

import { InspectorDrawer } from '@/components/inspector/inspector-drawer'
import { InspectorPanel } from '@/components/inspector/inspector-panel'

import { useArtifact } from './artifact-context'
export function ChatArtifactContainer({
  children
}: {
  children: React.ReactNode
}) {
  const { state } = useArtifact()
  const isMobile = useMediaQuery('(max-width: 767px)') // Below md breakpoint
  const [renderPanel, setRenderPanel] = useState(state.isOpen)
  const {
    open,
    openMobile,
    isMobile: isMobileSidebar,
    toggleSidebar
  } = useSidebar()

  useEffect(() => {
    if (state.isOpen) {
      setRenderPanel(true)
    } else {
      setRenderPanel(false)
    }
  }, [state.isOpen])

  return (
    <div className="flex-1 min-h-0 h-screen flex">
      {/* Mobile hamburger menu button - visible when sidebar is closed on mobile */}
      {isMobile && !openMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleSidebar()}
          className="fixed top-3 left-3 z-50 size-10 bg-background/80 backdrop-blur-sm border shadow-sm md:hidden mobile-menu"
          aria-label="Menu"
          data-testid="mobile-menu-button"
        >
          <Menu className="size-5" />
        </Button>
      )}
      {/* Desktop sidebar trigger - visible when sidebar is closed on desktop */}
      <div className="absolute p-4 z-50 transition-opacity duration-1000 hidden md:block">
        {!open && <SidebarTrigger className="animate-fade-in" />}
      </div>
      {/* Desktop: Resizable panels (Do not render on mobile) */}
      {!isMobile && (
        <ResizablePanelGroup
          direction="horizontal"
          className="flex flex-1 min-w-0 h-full" // Responsive classes removed
        >
          <ResizablePanel
            className={cn(
              'min-w-0',
              state.isOpen && 'transition-[flex-basis] duration-200 ease-out'
            )}
          >
            {children}
          </ResizablePanel>

          {renderPanel && (
            <>
              <ResizableHandle />
              <ResizablePanel
                className={cn('overflow-hidden', {
                  'animate-slide-in-right': state.isOpen
                })}
                maxSize={50}
                minSize={30}
                defaultSize={40}
              >
                <InspectorPanel />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}

      {/* Mobile: full-width chat + drawer (Do not render on desktop) */}
      {isMobile && (
        <div className="flex-1 h-full">
          {' '}
          {/* Responsive classes removed */}
          {children}
          {/* ArtifactDrawer checks isMobile internally, no double check needed */}
          <InspectorDrawer />
        </div>
      )}
    </div>
  )
}
