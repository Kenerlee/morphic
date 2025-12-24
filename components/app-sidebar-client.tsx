'use client'

import Link from 'next/link'

import { Compass, FileText, Plus, Settings, Users } from 'lucide-react'

import { useTranslations } from '@/lib/i18n/provider'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

interface AppSidebarNavProps {
  isAdmin?: boolean
}

export function AppSidebarNav({ isAdmin = false }: AppSidebarNavProps) {
  const t = useTranslations()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link href="/" className="flex items-center gap-2">
            <Plus className="size-4" />
            <span>{t('navigation.startResearch')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link href="/reports" className="flex items-center gap-2">
            <FileText className="size-4" />
            <span>{t('navigation.myReports')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link href="/discovery" className="flex items-center gap-2">
            <Compass className="size-4" />
            <span>{t('navigation.discovery')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link href="/expert" className="flex items-center gap-2">
            <Users className="size-4" />
            <span>{t('navigation.expert')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {isAdmin && (
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href="/admin" className="flex items-center gap-2">
              <Settings className="size-4" />
              <span>{t('navigation.admin')}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  )
}
