'use client'

import React, { useEffect, useState } from 'react'

import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { cn } from '@/lib/utils'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'

import { useEdit } from './edit-context'
import { EditWorkspacePanel } from './edit-workspace-panel'

export function EditWorkspaceContainer({
  children
}: {
  children: React.ReactNode
}) {
  const { state, close } = useEdit()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [renderPanel, setRenderPanel] = useState(state.isOpen)
  const { open, openMobile, isMobile: isMobileSidebar } = useSidebar()

  useEffect(() => {
    if (state.isOpen) {
      setRenderPanel(true)
    } else {
      // Delay unmounting to allow animation
      const timeout = setTimeout(() => setRenderPanel(false), 200)
      return () => clearTimeout(timeout)
    }
  }, [state.isOpen])

  return (
    <div className="flex-1 min-h-0 h-screen flex">
      <div className="absolute p-4 z-50 transition-opacity duration-1000">
        {(!open || isMobileSidebar) && (
          <SidebarTrigger className="animate-fade-in" />
        )}
      </div>

      {/* Desktop: Resizable panels */}
      {!isMobile && (
        <ResizablePanelGroup
          direction="horizontal"
          className="flex flex-1 min-w-0 h-full"
        >
          <ResizablePanel
            className={cn(
              'min-w-0',
              state.isOpen && 'transition-[flex-basis] duration-200 ease-out'
            )}
          >
            {children}
          </ResizablePanel>

          {renderPanel && state.isOpen && (
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
                <EditWorkspacePanel />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}

      {/* Mobile: Sheet/Drawer */}
      {isMobile && (
        <>
          <div className="flex-1 h-full">{children}</div>
          <Sheet open={state.isOpen} onOpenChange={open => !open && close()}>
            <SheetContent
              side="bottom"
              className="h-[90vh] p-0 flex flex-col"
              onInteractOutside={e => {
                if (state.isDirty) {
                  e.preventDefault()
                }
              }}
            >
              <EditWorkspacePanel />
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  )
}
