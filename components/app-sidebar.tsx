import { Suspense } from 'react'
import Link from 'next/link'

import { getUserProfile } from '@/lib/actions/user-profile'
import { cn } from '@/lib/utils'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar'

import { ChatHistorySection } from './sidebar/chat-history-section'
import { ChatHistorySkeleton } from './sidebar/chat-history-skeleton'
import { IconLogo } from './ui/icons'
import { AppSidebarNav } from './app-sidebar-client'
import { AppSidebarTitle } from './app-sidebar-title'
import GuestMenu from './guest-menu'
import UserMenu from './user-menu'

// Better Auth user type
interface User {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  phone?: string | null
  phoneVerified?: boolean | null
  role?: string | null
}

interface AppSidebarProps {
  user: User | null
}

export default async function AppSidebar({ user }: AppSidebarProps) {
  // 获取用户角色信息
  let isAdmin = false
  if (user) {
    try {
      const profile = await getUserProfile(user.id)
      isAdmin = profile?.role === 'admin'
    } catch (error) {
      console.error('Error fetching user profile for sidebar:', error)
    }
  }
  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="flex flex-row justify-between items-center">
        <Link href="/" className="flex items-center gap-2 px-2 py-3">
          <IconLogo className={cn('size-5')} />
          <AppSidebarTitle />
        </Link>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="flex flex-col px-2 py-4 h-full">
        <AppSidebarNav isAdmin={isAdmin} />
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<ChatHistorySkeleton />}>
            <ChatHistorySection />
          </Suspense>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        <div className="flex items-center gap-2">
          {user ? <UserMenu user={user} /> : <GuestMenu />}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
