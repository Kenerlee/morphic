'use client'

import Link from 'next/link'

import { FileText, Plus } from 'lucide-react'

import { useTranslations } from '@/lib/i18n/provider'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

export function AppSidebarNav() {
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
    </SidebarMenu>
  )
}
